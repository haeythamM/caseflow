import { useState, type ReactNode } from "react"

interface UserAvatarProps {
  userId: string
  avatarId: string | null
  alt: string
  className: string
  fallback: ReactNode
}

export default function UserAvatar(props: UserAvatarProps) {
  return <AvatarImage key={`${props.userId}:${props.avatarId}`} {...props} />
}

function AvatarImage({ userId, avatarId, alt, className, fallback }: UserAvatarProps) {
  const [failed, setFailed] = useState(false)

  if (!avatarId || failed) return <>{fallback}</>

  return (
    <img
      src={`/api/users/${encodeURIComponent(userId)}/avatar`}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
