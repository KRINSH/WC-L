from pydantic import BaseModel


# Payload used by the admin API to ban or unban a user.
class UserBanUpdate(BaseModel):
    is_banned: bool


# Payload used by the admin API to grant or revoke admin access.
class UserAdminAccessUpdate(BaseModel):
    is_admin: bool


