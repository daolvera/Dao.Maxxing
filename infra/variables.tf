variable "subscription_id" {
  description = "Azure subscription to deploy into."
  type        = string
}

variable "location" {
  description = "Azure region for every resource."
  type        = string
  default     = "westus"
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
