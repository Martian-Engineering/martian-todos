# Martian Todos Infrastructure

Terraform configuration for deploying Martian Todos to AWS.

## Architecture

- **VPC**: Private network with public/private subnets
- **RDS**: PostgreSQL database in private subnet
- **ECS Fargate**: Container orchestration for backend and frontend
- **ALB**: Application Load Balancer with HTTPS
- **ECR**: Docker image repositories for frontend and backend
- **Secrets Manager**: Database credentials and JWT secret

## Modules

- `vpc` - VPC with public/private subnets
- `rds` - PostgreSQL RDS instance
- `ecs` - ECS Fargate cluster and services
- `ecr` - ECR repositories for app images

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
3. Route53 hosted zone (or an existing ACM certificate ARN)
4. Docker images built and pushed to ECR (or use the GitHub Actions workflow)

## Variables

See `environments/dev/terraform.tfvars.example` for required variables.

## HTTPS and Domains

The ALB is configured for HTTPS with ACM. Provide either:

1. `domain_name` and `hosted_zone_id` (Terraform will request and validate a certificate), or
2. `acm_certificate_arn` (use an existing certificate)

## Secrets

Secrets are stored in AWS Secrets Manager:

- Database credentials (`<name>/db-credentials`)
- Database URL (`<name>/database-url`)
- JWT secret (`<name>/jwt-secret`)

ECS tasks read the `DATABASE_URL` and `JWT_SECRET` from Secrets Manager.

## CI/CD (GitHub Actions)

The workflow at `.github/workflows/deploy.yml` builds and pushes images to ECR
and triggers new ECS deployments. Configure these repository secrets:

- `AWS_ROLE_ARN` (OIDC role for GitHub Actions)
- `AWS_REGION`
- `ECR_BACKEND_REPOSITORY` (ex: `martian-todos-dev-backend`)
- `ECR_FRONTEND_REPOSITORY` (ex: `martian-todos-dev-frontend`)
- `ECS_CLUSTER` (ex: `martian-todos-dev-cluster`)
- `ECS_BACKEND_SERVICE` (ex: `martian-todos-dev-backend`)
- `ECS_FRONTEND_SERVICE` (ex: `martian-todos-dev-frontend`)

After `terraform apply`, use the ECR repository outputs and ECS service names to
populate the secrets above.
