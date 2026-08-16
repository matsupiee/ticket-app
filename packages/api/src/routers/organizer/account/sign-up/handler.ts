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

  const duplicatedOrganizer = await db.organizer.findUnique({
    where: {
      name: input.organizerName,
    },
    select: {
      id: true,
    },
  });

  if (duplicatedOrganizer) {
    throw new ORPCError("CONFLICT", {
      message: "同じ主催者名がすでに登録されています",
    });
  }

  // 精算先の会社は主催者ごとに1社作る。複数主催者を1社にまとめる運用は会社設定側で対応する
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
}
