import prisma from "./prisma";
import { templateLibrary } from "./templates";

async function main() {
  for (const [id, tmpl] of Object.entries(templateLibrary)) {
    await prisma.template.upsert({
      where: { templateId: id },
      update: { name: tmpl.name, aspectRatio: tmpl.aspect_ratio, duration: tmpl.duration, captionSafeWidth: tmpl.caption_safe_width, captionMaxLines: tmpl.caption_max_lines, logoZone: tmpl.logo_zone, ctaStart: tmpl.cta_start, scenes: tmpl.scenes, config: tmpl as any },
      create: { templateId: id, name: tmpl.name, aspectRatio: tmpl.aspect_ratio, duration: tmpl.duration, captionSafeWidth: tmpl.caption_safe_width, captionMaxLines: tmpl.caption_max_lines, logoZone: tmpl.logo_zone, ctaStart: tmpl.cta_start, scenes: tmpl.scenes, config: tmpl as any },
    });
    console.log(`Seeded template ${id}`);
  }
  console.log("Done seeding");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
