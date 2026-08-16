import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

import { getFirstOrganizerMembership } from "../../../../shared/organizer-access";

export async function signUpOrganizerAccountHandler({
  input,
  context,
}: {
  input: {
    organizerName: string;
  };
  context: {
    session: {
      user: {
        id: string;
        email: string;
      };
    };
  };
}) {
  // 登録済みユーザーが再度登録操作をしても主催者が増えないよう、所属済みならその主催者を返す
  const existingMembership = await getFirstOrganizerMembership(context.session.user.id);

  if (existingMembership) {
    return {
      eventOrganizerId: existingMembership.organizerId,
      name: existingMembership.organizer.name,
      role: existingMembership.role,
    };
  }

  // 精算先の会社は主催者ごとに1社作る。複数主催者を1社にまとめる運用は会社設定側で対応する
  // Organizer.name と Company.name はどちらも一意なため、重複は一意制約違反として受け取る
  try {
    const member = await db.organizerMember.create({
      data: {
        role: "EDITOR",
        user: {
          connect: {
            id: context.session.user.id,
          },
        },
        organizer: {
          create: {
            name: input.organizerName,
            inquiryEmail: context.session.user.email,
            company: {
              create: {
                name: `${input.organizerName} 運営会社`,
              },
            },
          },
        },
      },
      include: {
        organizer: true,
      },
    });

    return {
      eventOrganizerId: member.organizerId,
      name: member.organizer.name,
      role: member.role,
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ORPCError("CONFLICT", {
        message: "同じ主催者名がすでに登録されています",
      });
    }

    throw error;
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}
