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
  description = "Backend Docker image URI"
  type        = string
}

variable "frontend_image" {
  description = "Frontend Docker image URI"
  type        = string
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

locals {
  name = "martian-todos-dev"
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

  allowed_security_groups = [module.ecs.ecs_security_group_id]
}

# ECS
module "ecs" {
  source = "../../modules/ecs"

  name               = local.name
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids

  backend_image  = var.backend_image
  frontend_image = var.frontend_image

  database_url_secret_arn = module.rds.secret_arn
  jwt_secret              = var.jwt_secret
}

# Outputs
output "alb_url" {
  description = "Application URL"
  value       = "http://${module.ecs.alb_dns_name}"
}

output "database_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
}
