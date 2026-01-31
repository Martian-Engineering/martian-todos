# Martian Todos - Development Environment

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Uncomment to use S3 backend
  # backend "s3" {
  #   bucket = "martian-todos-terraform-state"
  #   key    = "dev/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "martian-todos"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "backend_image" {
  description = "Override backend Docker image URI"
  type        = string
  default     = ""
}

variable "frontend_image" {
  description = "Override frontend Docker image URI"
  type        = string
  default     = ""
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Domain name for HTTPS (e.g. todos.example.com)"
  type        = string
  default     = ""

  validation {
    condition     = var.acm_certificate_arn != "" || var.domain_name != ""
    error_message = "domain_name is required when acm_certificate_arn is not provided."
  }
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone ID for domain validation"
  type        = string
  default     = ""

  validation {
    condition     = var.acm_certificate_arn != "" || var.hosted_zone_id != ""
    error_message = "hosted_zone_id is required when acm_certificate_arn is not provided."
  }
}

variable "acm_certificate_arn" {
  description = "Existing ACM certificate ARN (optional)"
  type        = string
  default     = ""
}

locals {
  name = "martian-todos-dev"
}

# ECR repositories
module "ecr" {
  source = "../../modules/ecr"

  name = local.name
}

# ACM certificate for HTTPS (create if not provided)
resource "aws_acm_certificate" "main" {
  count = var.acm_certificate_arn == "" ? 1 : 0

  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "acm_validation" {
  for_each = var.acm_certificate_arn == "" ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = var.hosted_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "main" {
  count = var.acm_certificate_arn == "" ? 1 : 0

  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
}

# JWT secret in Secrets Manager
resource "aws_secretsmanager_secret" "jwt" {
  name = "${local.name}/jwt-secret"
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id     = aws_secretsmanager_secret.jwt.id
  secret_string = var.jwt_secret
}

locals {
  backend_image  = var.backend_image != "" ? var.backend_image : "${module.ecr.backend_repository_url}:latest"
  frontend_image = var.frontend_image != "" ? var.frontend_image : "${module.ecr.frontend_repository_url}:latest"
  certificate_arn = var.acm_certificate_arn != "" ? var.acm_certificate_arn : aws_acm_certificate_validation.main[0].certificate_arn
}

# VPC
module "vpc" {
  source = "../../modules/vpc"

  name = local.name
  azs  = ["${var.aws_region}a", "${var.aws_region}b"]
}

# RDS
module "rds" {
  source = "../../modules/rds"

  name       = local.name
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids

  instance_class = "db.t3.micro"
  allowed_security_groups = []
}

# ECS
module "ecs" {
  source = "../../modules/ecs"

  name               = local.name
  vpc_id             = module.vpc.vpc_id
  aws_region         = var.aws_region
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids

  backend_image  = local.backend_image
  frontend_image = local.frontend_image

  database_url_secret_arn = module.rds.database_url_secret_arn
  jwt_secret_arn          = aws_secretsmanager_secret.jwt.arn
  certificate_arn         = local.certificate_arn
}

resource "aws_security_group_rule" "rds_from_ecs" {
  description              = "Allow ECS tasks to access RDS"
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = module.rds.security_group_id
  source_security_group_id = module.ecs.ecs_security_group_id
}

# Outputs
output "alb_url" {
  description = "Application URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "https://${module.ecs.alb_dns_name}"
}

output "database_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
}

output "backend_repository_url" {
  description = "ECR repository URL for backend"
  value       = module.ecr.backend_repository_url
}

output "frontend_repository_url" {
  description = "ECR repository URL for frontend"
  value       = module.ecr.frontend_repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_backend_service_name" {
  description = "ECS backend service name"
  value       = module.ecs.backend_service_name
}

output "ecs_frontend_service_name" {
  description = "ECS frontend service name"
  value       = module.ecs.frontend_service_name
}
