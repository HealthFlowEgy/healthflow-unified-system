# Production Deployment Guide: HealthFlow Unified System

**Version**: 2.0.0  
**Date**: 2025-12-03

---

## 1. Overview

This guide provides comprehensive instructions for deploying the HealthFlow Unified System to a production environment using Kubernetes. This approach ensures scalability, reliability, and maintainability for a national-level digital prescription system.

**Deployment Strategy**: The system is deployed using **Helm**, a package manager for Kubernetes, which simplifies the management of complex applications. The Helm chart is located in the `k8s/helm/` directory.

### Prerequisites

- A running Kubernetes cluster (v1.21+)
- `kubectl` configured to connect to your cluster
- Helm v3+ installed
- A configured Ingress controller (e.g., NGINX)
- A configured Certificate Manager (e.g., cert-manager) for automatic SSL/TLS
- An external secrets management system (e.g., AWS Secrets Manager, HashiCorp Vault, or Kubernetes Sealed Secrets)

---

## 2. Secrets Management

**CRITICAL**: Before deploying, you must securely manage all application secrets. **DO NOT** hardcode secrets in your Helm values or commit them to Git.

### Step 1: Generate Secrets

Generate strong, random secrets for the following:

- **PostgreSQL Password**: `openssl rand -base64 32`
- **JWT Secret Key**: `openssl rand -hex 32`
- **Application Secret Key**: `openssl rand -hex 32`

### Step 2: Store Secrets Externally

Store these secrets in your chosen secrets management system. For example, using Kubernetes secrets:

```bash
# Create the healthflow namespace
kubectl create namespace healthflow

# Create PostgreSQL secret
kubectl create secret generic postgres-secret -n healthflow \
  --from-literal=password=\"<YOUR_POSTGRES_PASSWORD>"

# Create application secrets
kubectl create secret generic app-secrets -n healthflow \
  --from-literal=jwt-secret="<YOUR_JWT_SECRET>" \
  --from-literal=app-secret="<YOUR_APP_SECRET>"
```

---

## 3. Configuration

Create a `prod-values.yaml` file to override the default Helm chart values for your production environment.

```yaml
# prod-values.yaml

global:
  domain: your-domain.gov.eg

# Reference the externally managed secrets
postgresql:
  auth:
    existingSecret: "postgres-secret"

secrets:
  existingAppSecret: "app-secrets"

# Ingress configuration
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.your-domain.gov.eg
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: healthflow-tls
      hosts:
        - api.your-domain.gov.eg

# Set production image tags
apiGateway:
  image:
    tag: v2.0.0
authService:
  image:
    tag: v2.0.0
# ... set tags for all other services

# Enable monitoring
monitoring:
  enabled: true
```

---

## 4. Deployment

Follow these steps to deploy the HealthFlow system to your Kubernetes cluster.

### Step 1: Add Helm Repository (if applicable)

If you are hosting your Helm chart in a repository:

```bash
helm repo add healthflow https://charts.healthflow.gov.eg
helm repo update
```

### Step 2: Install the Helm Chart

Deploy the application to the `healthflow` namespace using your custom values file.

```bash
# Navigate to the k8s/helm directory
cd k8s/helm

# Perform a dry run to validate the configuration
helm install healthflow . \
  --namespace healthflow \
  --values prod-values.yaml \
  --dry-run

# If the dry run is successful, proceed with the installation
helm install healthflow . \
  --namespace healthflow \
  --values prod-values.yaml
```

### Step 3: Verify the Deployment

Check the status of the deployment to ensure all pods are running correctly.

```bash
# Check the status of all pods in the healthflow namespace
kubectl get pods -n healthflow -w

# Check the status of the Helm release
helm status healthflow -n healthflow

# Check the Ingress to get the public IP address
kubectl get ingress -n healthflow
```

Once the Ingress has an IP address, you can access the API at `https://api.your-domain.gov.eg`.

---

## 5. Upgrading the System

To upgrade the system to a new version, update your image tags in `prod-values.yaml` and run the `helm upgrade` command.

```bash
# Update your prod-values.yaml with new image tags

# Upgrade the Helm release
helm upgrade healthflow . \
  --namespace healthflow \
  --values prod-values.yaml
```

## 6. Rolling Back a Deployment

If an upgrade fails, you can easily roll back to a previous revision.

```bash
# List all release revisions
helm history healthflow -n healthflow

# Roll back to a specific revision (e.g., revision 1)
helm rollback healthflow 1 -n healthflow
```

---

## 7. Monitoring and Logging

- **Grafana**: Access the Grafana dashboard by port-forwarding the Grafana service:
  `kubectl port-forward svc/grafana -n healthflow 3000:3000`
  Navigate to `http://localhost:3000` and log in with the default credentials (admin/admin).

- **Prometheus**: Access Prometheus to query metrics:
  `kubectl port-forward svc/prometheus -n healthflow 9090:9090`

- **Alertmanager**: View active alerts:
  `kubectl port-forward svc/alertmanager -n healthflow 9093:9093`

- **Logs**: View real-time logs for any service using `kubectl`:
  `kubectl logs -f -n healthflow -l app=api-gateway`
