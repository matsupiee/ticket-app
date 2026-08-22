export function handler({
  context,
}: {
  context: {
    platformMember: {
      role: "OWNER" | "EDITOR" | "VIEWER";
      user: {
        id: string;
        name: string;
        email: string;
      };
    };
  };
}) {
  return {
    userId: context.platformMember.user.id,
    name: context.platformMember.user.name,
    email: context.platformMember.user.email,
    role: context.platformMember.role,
  };
}
