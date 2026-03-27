#!/usr/bin/env bash
# ==============================================================
# TLC Models - CloudFormation Deployment Script
# Region: us-east-2
# Account: 783837107016
#
# RESOURCE STATUS SUMMARY:
#   [EXISTS]  S3 bucket tlc-models-media (missing CORS + policy)
#   [EXISTS]  CloudFront E2CYPPTF8LHEO0 (missing custom error pages)
#   [EXISTS]  DynamoDB TLCTalentProfiles (missing GSIs)
#   [EXISTS]  Lambda TLCRekognitionTagger
#   [EXISTS]  Cognito TLCModelsTalentPortal (missing groups)
#   [EXISTS]  SES tlcmodels.com + 3 templates
#
# Since all resources already exist, this script can operate in
# two modes:
#   1. IMPORT mode: Import existing resources into CloudFormation
#   2. PATCH mode: Apply only the missing configurations via CLI
#
# Usage:
#   ./deploy.sh [import|patch|validate|status]
# ==============================================================
set -euo pipefail

REGION="us-east-2"
ACCOUNT_ID="783837107016"
STACK_PREFIX="tlc-models"
CFN_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ==============================================================
# Validate all templates
# ==============================================================
validate_templates() {
    log_info "Validating CloudFormation templates..."
    local templates=(
        "cfn-storage.yaml"
        "cfn-cdn.yaml"
        "cfn-database.yaml"
        "cfn-lambda.yaml"
        "cfn-auth.yaml"
        "cfn-email.yaml"
    )
    local failed=0
    for tmpl in "${templates[@]}"; do
        if aws cloudformation validate-template \
            --template-body "file://${CFN_DIR}/${tmpl}" \
            --region "${REGION}" > /dev/null 2>&1; then
            log_ok "  ${tmpl}"
        else
            log_error "  ${tmpl} - INVALID"
            aws cloudformation validate-template \
                --template-body "file://${CFN_DIR}/${tmpl}" \
                --region "${REGION}" 2>&1 || true
            failed=1
        fi
    done
    if [ "$failed" -eq 1 ]; then
        log_error "Template validation failed. Fix errors before deploying."
        exit 1
    fi
    log_ok "All templates valid."
}

# ==============================================================
# Check existing resource status
# ==============================================================
check_status() {
    log_info "Checking existing AWS resources in ${REGION}..."
    echo ""

    # S3
    if aws s3 ls s3://tlc-models-media --region "${REGION}" > /dev/null 2>&1; then
        log_ok "S3 bucket tlc-models-media EXISTS"
        # Check CORS
        if aws s3api get-bucket-cors --bucket tlc-models-media --region "${REGION}" > /dev/null 2>&1; then
            log_ok "  CORS: configured"
        else
            log_warn "  CORS: MISSING"
        fi
        # Check policy
        if aws s3api get-bucket-policy --bucket tlc-models-media --region "${REGION}" > /dev/null 2>&1; then
            log_ok "  Bucket policy: configured"
        else
            log_warn "  Bucket policy: MISSING"
        fi
    else
        log_warn "S3 bucket tlc-models-media DOES NOT EXIST"
    fi

    # DynamoDB
    if aws dynamodb describe-table --table-name TLCTalentProfiles --region "${REGION}" > /dev/null 2>&1; then
        log_ok "DynamoDB table TLCTalentProfiles EXISTS"
        GSI_COUNT=$(aws dynamodb describe-table --table-name TLCTalentProfiles --region "${REGION}" \
            --query 'Table.GlobalSecondaryIndexes | length(@)' --output text 2>/dev/null || echo "0")
        if [ "${GSI_COUNT}" != "None" ] && [ "${GSI_COUNT}" -gt 0 ] 2>/dev/null; then
            log_ok "  GSIs: ${GSI_COUNT} configured"
        else
            log_warn "  GSIs: NONE (need GSI-Location, GSI-UpdatedAt)"
        fi
    else
        log_warn "DynamoDB table TLCTalentProfiles DOES NOT EXIST"
    fi

    # CloudFront
    if aws cloudfront list-distributions --region "${REGION}" \
        --query 'DistributionList.Items[?Origins.Items[0].DomainName==`tlc-models-media.s3.us-east-2.amazonaws.com`].Id' \
        --output text 2>/dev/null | grep -q "E2CYPPTF8LHEO0"; then
        log_ok "CloudFront distribution E2CYPPTF8LHEO0 EXISTS"
    else
        log_warn "CloudFront distribution for tlc-models-media NOT FOUND"
    fi

    # Lambda
    if aws lambda get-function --function-name TLCRekognitionTagger --region "${REGION}" > /dev/null 2>&1; then
        log_ok "Lambda TLCRekognitionTagger EXISTS"
    else
        log_warn "Lambda TLCRekognitionTagger DOES NOT EXIST"
    fi

    # Cognito
    POOL_ID=$(aws cognito-idp list-user-pools --max-results 10 --region "${REGION}" \
        --query 'UserPools[?Name==`TLCModelsTalentPortal`].Id' --output text 2>/dev/null || echo "")
    if [ -n "${POOL_ID}" ] && [ "${POOL_ID}" != "None" ]; then
        log_ok "Cognito User Pool TLCModelsTalentPortal EXISTS (${POOL_ID})"
        GROUP_COUNT=$(aws cognito-idp list-groups --user-pool-id "${POOL_ID}" --region "${REGION}" \
            --query 'Groups | length(@)' --output text 2>/dev/null || echo "0")
        if [ "${GROUP_COUNT}" -gt 0 ] 2>/dev/null; then
            log_ok "  Groups: ${GROUP_COUNT} configured"
        else
            log_warn "  Groups: NONE (need talent, client, administrator)"
        fi
    else
        log_warn "Cognito User Pool TLCModelsTalentPortal DOES NOT EXIST"
    fi

    # SES
    if aws ses list-identities --identity-type Domain --region "${REGION}" \
        --query 'Identities' --output text 2>/dev/null | grep -q "tlcmodels.com"; then
        log_ok "SES domain tlcmodels.com VERIFIED"
    else
        log_warn "SES domain tlcmodels.com NOT VERIFIED"
    fi

    TEMPLATE_COUNT=$(aws ses list-templates --region "${REGION}" \
        --query 'TemplatesMetadata | length(@)' --output text 2>/dev/null || echo "0")
    log_ok "SES templates: ${TEMPLATE_COUNT} configured"

    echo ""
    log_info "Status check complete."
}

# ==============================================================
# PATCH mode: Apply missing configurations via CLI
# This is the safest approach for already-existing resources.
# ==============================================================
patch_resources() {
    log_info "Applying missing configurations to existing resources..."
    echo ""

    # --- 1. S3 CORS ---
    log_info "Applying CORS to tlc-models-media..."
    cat > /tmp/tlc-cors.json << 'CORS_EOF'
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
      "AllowedOrigins": [
        "https://tlcmodels.com",
        "https://*.tlcmodels.com",
        "http://localhost:3000",
        "http://localhost:5173"
      ],
      "ExposeHeaders": ["ETag", "x-amz-meta-custom-header"],
      "MaxAgeSeconds": 3600
    }
  ]
}
CORS_EOF
    aws s3api put-bucket-cors \
        --bucket tlc-models-media \
        --cors-configuration file:///tmp/tlc-cors.json \
        --region "${REGION}"
    log_ok "S3 CORS applied."

    # --- 2. S3 Bucket Policy ---
    log_info "Applying bucket policy to tlc-models-media..."
    cat > /tmp/tlc-bucket-policy.json << POLICY_EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadMedia",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": [
        "arn:aws:s3:::tlc-models-media/photos/*",
        "arn:aws:s3:::tlc-models-media/headshots/*",
        "arn:aws:s3:::tlc-models-media/portfolio/*"
      ]
    }
  ]
}
POLICY_EOF
    aws s3api put-bucket-policy \
        --bucket tlc-models-media \
        --policy file:///tmp/tlc-bucket-policy.json \
        --region "${REGION}"
    log_ok "S3 bucket policy applied."

    # --- 3. DynamoDB GSIs ---
    log_info "Adding GSIs to TLCTalentProfiles..."
    GSI_COUNT=$(aws dynamodb describe-table --table-name TLCTalentProfiles --region "${REGION}" \
        --query 'Table.GlobalSecondaryIndexes | length(@)' --output text 2>/dev/null || echo "0")
    if [ "${GSI_COUNT}" = "None" ] || [ "${GSI_COUNT}" -eq 0 ] 2>/dev/null; then
        aws dynamodb update-table \
            --table-name TLCTalentProfiles \
            --region "${REGION}" \
            --attribute-definitions \
                AttributeName=location,AttributeType=S \
                AttributeName=updatedAt,AttributeType=N \
            --global-secondary-index-updates \
                "[{\"Create\":{\"IndexName\":\"GSI-Location\",\"KeySchema\":[{\"AttributeName\":\"location\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"updatedAt\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}}]"
        log_ok "GSI-Location creation initiated."
        log_warn "Wait for GSI-Location to become ACTIVE before adding GSI-UpdatedAt."
        log_info "Run this after GSI-Location is active:"
        echo "  aws dynamodb update-table --table-name TLCTalentProfiles --region ${REGION} \\"
        echo "    --attribute-definitions AttributeName=talent_id,AttributeType=S AttributeName=updatedAt,AttributeType=N \\"
        echo "    --global-secondary-index-updates '[{\"Create\":{\"IndexName\":\"GSI-UpdatedAt\",\"KeySchema\":[{\"AttributeName\":\"talent_id\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"updatedAt\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}}]'"
    else
        log_ok "GSIs already exist, skipping."
    fi

    # --- 4. Cognito Groups ---
    POOL_ID=$(aws cognito-idp list-user-pools --max-results 10 --region "${REGION}" \
        --query 'UserPools[?Name==`TLCModelsTalentPortal`].Id' --output text)
    if [ -n "${POOL_ID}" ] && [ "${POOL_ID}" != "None" ]; then
        log_info "Adding groups to Cognito User Pool ${POOL_ID}..."
        for group_info in "talent:Talent/model users:3" "client:Client users who book talent:2" "administrator:Administrator users with full access:1"; do
            IFS=':' read -r name desc precedence <<< "${group_info}"
            if aws cognito-idp get-group --group-name "${name}" --user-pool-id "${POOL_ID}" --region "${REGION}" > /dev/null 2>&1; then
                log_ok "  Group '${name}' already exists."
            else
                aws cognito-idp create-group \
                    --group-name "${name}" \
                    --user-pool-id "${POOL_ID}" \
                    --description "${desc}" \
                    --precedence "${precedence}" \
                    --region "${REGION}"
                log_ok "  Group '${name}' created."
            fi
        done
    else
        log_error "Cognito User Pool not found. Cannot create groups."
    fi

    echo ""
    log_ok "Patch complete. Run './deploy.sh status' to verify."
}

# ==============================================================
# Deploy new stacks (for resources that don't exist yet)
# ==============================================================
deploy_stacks() {
    log_info "Deploying CloudFormation stacks in dependency order..."
    echo ""

    # Order: storage -> database -> lambda -> auth -> cdn -> email
    local stacks=(
        "${STACK_PREFIX}-storage:cfn-storage.yaml"
        "${STACK_PREFIX}-database:cfn-database.yaml"
        "${STACK_PREFIX}-lambda:cfn-lambda.yaml"
        "${STACK_PREFIX}-auth:cfn-auth.yaml"
        "${STACK_PREFIX}-cdn:cfn-cdn.yaml"
        "${STACK_PREFIX}-email:cfn-email.yaml"
    )

    for stack_info in "${stacks[@]}"; do
        IFS=':' read -r stack_name template <<< "${stack_info}"
        log_info "Deploying stack: ${stack_name} (${template})..."

        if aws cloudformation describe-stacks --stack-name "${stack_name}" --region "${REGION}" > /dev/null 2>&1; then
            log_warn "  Stack ${stack_name} already exists. Updating..."
            aws cloudformation update-stack \
                --stack-name "${stack_name}" \
                --template-body "file://${CFN_DIR}/${template}" \
                --capabilities CAPABILITY_NAMED_IAM \
                --region "${REGION}" 2>&1 || log_warn "  No updates needed for ${stack_name}."
        else
            log_info "  Creating stack ${stack_name}..."
            aws cloudformation create-stack \
                --stack-name "${stack_name}" \
                --template-body "file://${CFN_DIR}/${template}" \
                --capabilities CAPABILITY_NAMED_IAM \
                --region "${REGION}" \
                --tags Key=Project,Value=TLCModels Key=Environment,Value=production

            log_info "  Waiting for stack creation..."
            aws cloudformation wait stack-create-complete \
                --stack-name "${stack_name}" \
                --region "${REGION}"
        fi

        log_ok "  ${stack_name} deployed."
        echo ""
    done

    log_ok "All stacks deployed."
}

# ==============================================================
# Main
# ==============================================================
case "${1:-help}" in
    validate)
        validate_templates
        ;;
    status)
        check_status
        ;;
    patch)
        validate_templates
        patch_resources
        ;;
    deploy)
        validate_templates
        deploy_stacks
        ;;
    import)
        log_info "To import existing resources into CloudFormation, use:"
        echo "  aws cloudformation create-change-set \\"
        echo "    --stack-name ${STACK_PREFIX}-storage \\"
        echo "    --change-set-name import-media-bucket \\"
        echo "    --change-set-type IMPORT \\"
        echo "    --resources-to-import '[{\"ResourceType\":\"AWS::S3::Bucket\",\"LogicalResourceId\":\"TLCMediaBucket\",\"ResourceIdentifier\":{\"BucketName\":\"tlc-models-media\"}}]' \\"
        echo "    --template-body file://${CFN_DIR}/cfn-storage.yaml \\"
        echo "    --region ${REGION}"
        echo ""
        log_info "Repeat for each stack/resource as needed."
        ;;
    help|*)
        echo ""
        echo "TLC Models Infrastructure Deployment"
        echo "====================================="
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  validate  - Validate all CloudFormation templates"
        echo "  status    - Check existing AWS resource state"
        echo "  patch     - Apply missing configs to existing resources (safe)"
        echo "  deploy    - Create/update CloudFormation stacks (full IaC)"
        echo "  import    - Show commands to import existing resources into CFN"
        echo "  help      - Show this message"
        echo ""
        echo "Recommended workflow:"
        echo "  1. $0 status     # See what exists"
        echo "  2. $0 validate   # Check templates are valid"
        echo "  3. $0 patch      # Apply missing CORS, groups, GSIs"
        echo "  4. $0 import     # (Optional) Bring resources under CFN"
        echo "  5. $0 deploy     # (Optional) Full CFN stack deployment"
        echo ""
        ;;
esac
