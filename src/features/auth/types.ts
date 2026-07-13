export interface AuthToken {
  token: string
  expires_at: string
}

export type LoginResponse = AuthToken
