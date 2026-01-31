# Martian Todos Infrastructure

Terraform configuration for deploying Martian Todos to AWS.

## Architecture

- **VPC**: Private network with public/private subnets
- **RDS**: PostgreSQL database in private subnet
- **ECS Fargate**: Container orchestration for backend and frontend
- **ALB**: Application Load Balancer for routing

## Modules

- `vpc` - VPC with public/private subnets
- `rds` - PostgreSQL RDS instance
- `ecs` - ECS Fargate cluster and services

## Environments

- `dev` - Development environment

## Usage

```bash
cd environments/dev
terraform init
terraform plan
terraform apply
```

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Terraform >= 1.0
3. Docker images built and pushed to ECR

## Variables

See `environments/dev/terraform.tfvars.example` for required variables.
