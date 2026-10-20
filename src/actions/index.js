"use server";

import { revalidatePath } from "next/cache";
import db from "../../prisma/db";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { redirect } from "next/navigation";

import bcrypt from "bcrypt";
import logger from "@/logger";

export async function incrementThumbsUp(post) {
  logger.info("incrementando o like do post", {
    postId: post.id,
    slug: post.slug,
  });

  await db.post.update({
    where: {
      id: post.id,
    },
    data: {
      likes: {
        increment: 1,
      },
    },
  });

  revalidatePath("/");
  revalidatePath(`/posts/${post.slug}`);
}

export async function postComment(post, formData) {
  const session = await getServerSession(options);

  await db.comment.create({
    data: {
      text: formData.get("text"),
      authorId: session.user.id,
      postId: post.id,
    },
  });

  revalidatePath("/");
  revalidatePath(`/posts/${post.slug}`);
}

export async function postReply(parent, formData) {
  const session = await getServerSession(options);

  const post = await db.post.findFirst({
    where: {
      id: parent.postId,
    },
  });

  await db.comment.create({
    data: {
      text: formData.get("text"),
      authorId: session.user.id,
      postId: post.id,
      parentId: parent.parentId ?? parent.id,
    },
  });

  revalidatePath(`/posts/${post.slug}`);
}

export async function createUser(formData) {
  const name = formData.get("name");
  const email = formData.get("email");

  try {
    logger.info("Iniciando cadastro de usuario", { name, email });

    const hashedPassword = bcrypt.hashSync(formData.get("password"), 10);

    await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    logger.info("Cadastro finalizado", { name, email });
  } catch (error) {
    logger.error("Falha ao criar usuario =>", { name, email, error });
    return;
  }

  redirect("/signin");
}
