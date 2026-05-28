export interface Notification {
  id: string
  user_id: string
  type: "appointment_created" | "appointment_updated" | "appointment_cancelled" | "appointment_status"
  title: string
  message: string
  data: Record<string, unknown>
  read: boolean
  created_at: string
}
