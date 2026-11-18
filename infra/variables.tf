variable "subscription_id" {
  description = "Azure subscription to deploy into."
  type        = string
}

variable "location" {
  description = "Azure region for every resource."
  type        = string
  default     = "westus3"
}

variable "environment_name" {
  description = "Short environment name, used in resource names."
  type        = string
  default     = "prod"
}

variable "image_tag" {
  description = "Tag of the dao-maxxing-api image in the registry. Only used when the Container App is first created; later deployments change the image outside Terraform (D4)."
  type        = string
  default     = "initial"
}

variable "public_origin" {
  description = "Public HTTPS origin of the app when using a custom domain. Leave empty to use the Container App's default address."
  type        = string
  default     = ""
}

variable "use_sql_free_offer" {
  description = "Use Azure SQL's free offer (one database per subscription). Changing it recreates the database."
  type        = bool
  default     = true
}

variable "sql_free_limit_exhaustion_behavior" {
  description = "When the free monthly allowance runs out: AutoPause (database unavailable until next month) or BillOverUsage (normal serverless billing)."
  type        = string
  default     = "AutoPause"

  validation {
    condition     = contains(["AutoPause", "BillOverUsage"], var.sql_free_limit_exhaustion_behavior)
    error_message = "Use AutoPause or BillOverUsage."
  }
}
