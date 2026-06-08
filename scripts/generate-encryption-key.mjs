import crypto from "node:crypto"

const key = crypto.randomBytes(32).toString("hex")
console.log(`APP_CONFIG_ENCRYPTION_KEY=${key}`)
