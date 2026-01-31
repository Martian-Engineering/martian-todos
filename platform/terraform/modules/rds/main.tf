# RDS Module - PostgreSQL database

variable "name" {
  description = "Name prefix for resources"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for RDS"
  type        = list(string)
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "allocated_storage" {
  description = "Storage in GB"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "martian_todos"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "martian"
}

variable "allowed_security_groups" {
  description = "Security groups allowed to access RDS"
  type        = list(string)
  default     = []
}

# Random password for database
resource "random_password" "db" {
  length  = 32
  special = false
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.name}-db-subnet"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "${var.name}-db-subnet"
  }
}

# Security Group
resource "aws_security_group" "rds" {
  name        = "${var.name}-rds-sg"
  description = "RDS security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.name}-rds-sg"
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = "${var.name}-postgres"

  engine         = "postgres"
  engine_version = "16.4"
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.allocated_storage * 2
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 7
  skip_final_snapshot     = true # Set to false for production

  tags = {
    Name = "${var.name}-postgres"
  }
}

# Store password in Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name = "${var.name}/db-password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db.result
    host     = aws_db_instance.main.address
    port     = 5432
    database = var.db_name
  })
}

# Outputs
output "endpoint" {
  value = aws_db_instance.main.endpoint
}

output "host" {
  value = aws_db_instance.main.address
}

output "port" {
  value = aws_db_instance.main.port
}

output "database_name" {
  value = var.db_name
}

output "security_group_id" {
  value = aws_security_group.rds.id
}

output "secret_arn" {
  value = aws_secretsmanager_secret.db_password.arn
}
