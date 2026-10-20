import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { options } from "../auth/[...nextauth]/options";
import db from "../../../../prisma/db";
import TurndownService from "turndown";
import logger from "@/logger";

const tracer = global.__tracer__;

function generateSlug(title) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function htmlToMarkdown(html) {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  // Regra para code blocks
  turndownService.addRule("codeBlock", {
    filter: ["pre"],
    replacement: function (content, node) {
      const code = node.querySelector("code");
      const language = code?.className?.replace("language-", "") || "";
      const text = code?.textContent || content;
      return `\n\`\`\`${language}\n${text}\n\`\`\`\n`;
    },
  });

  return turndownService.turndown(html);
}

export async function POST(request) {
  const session = await getServerSession(options);

  if (!session || !session.user) {
    logger.warn("Tentativa de criar um post quando não autenticado", {
      headers: Object.fromEntries(request.headers),
    });
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const title = formData.get("title");
    const coverFile = formData.get("cover");
    const bodyHtml = formData.get("body");
    const codeHtml = formData.get("markdown"); // opcional - código

    if (!title || !coverFile || !bodyHtml) {
      return NextResponse.json(
        { error: "Título, capa e conteúdo são obrigatórios" },
        { status: 400 },
      );
    }

    // Converter HTML para Markdown
    const body = htmlToMarkdown(bodyHtml);

    // Converter código HTML para Markdown (se existir)
    const markdown = codeHtml ? htmlToMarkdown(codeHtml) : null;

    // Upload da capa para o Vercel Blob
    const timestamp = Date.now();
    const filename = `post-cover-${session.user.id}-${timestamp}`;

    let blob;

    logger.info("upload de capa", {
      filename,
      title,
    });

    if (!tracer || !tracer.wrap) {
      blob = await put(filename, coverFile, {
        access: "public",
      });
    } else {
      await tracer.wrap(
        "image.upload",
        {
          "span.kind": "client",
          "upload.provider": "vercel",
          "upload.filename": filename,
          "upload.filesize": coverFile.size,
          "upload.filetype": coverFile.type,
        },
        async () => {
          blob = await put(filename, coverFile, {
            access: "public",
          });
        },
      )();
    }

    logger.info("upload de capa concluído", {
      filename,
      title,
      url: blob.url,
    });
    const coverUrl = blob.url;

    // Gerar slug a partir do título
    const slug = generateSlug(title);

    // Verificar se slug já existe
    const existingPost = await db.post.findUnique({
      where: { slug },
    });

    if (existingPost) {
      logger.error("Tentativa de criar post com slug duplicado!", { slug });
      throw new Error(`Já existe um post com o slug "${slug}"`);
    }

    // Criar o post
    const post = await db.post.create({
      data: {
        title,
        slug,
        cover: coverUrl,
        body,
        markdown: markdown || null,
        authorId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, post, slug: post.slug });
  } catch (error) {
    console.error("Erro ao criar post:", error);
    return NextResponse.json({ error: "Erro ao criar post" }, { status: 500 });
  }
}
