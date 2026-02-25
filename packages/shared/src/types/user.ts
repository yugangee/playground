export interface User {
  id: string
  name: string
  email: string
  profileImageUrl?: string
  createdAt: string
}

export interface Friend {
  userId: string
  friendId: string
  createdAt: string
}
