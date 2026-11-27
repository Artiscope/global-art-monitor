// Checks on the site's content. data/sales.json and data/content.json stay the one place the
// figures and words live, because Artiscope Digital Home reads and writes them. These rules
// stop a build if an entry breaks the auction data rules in CLAUDE.md, so a mistake shows up
// before it reaches the live site.
import fs from "node:fs";
import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { z } from "astro/zod";

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,80}$/, "a web address of small letters, digits and hyphens");
const salesFile = JSON.parse(fs.readFileSync("data/sales.json", "utf8"));
const artistSlugs = Object.keys(salesFile.artists || {}) as [string, ...string[]];

// a price is a whole number, or null when it is not known ("To confirm"); never text or a guess
const price = z.number().int().nonnegative().nullable().optional();

const sales = defineCollection({
  loader: file("data/sales.json", { parser: (text) => JSON.parse(text).sales }),
  schema: z.object({
    artist: z.enum(artistSlugs, { message: "a sale must name an artist listed under artists in data/sales.json" }),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "the sale date is written as YYYY-MM-DD"),
    date_text: z.string().optional(),
    title: z.string().min(1),
    house: z.string().min(1),
    sale: z.string().optional(),
    lot: z.string().nullable().optional(),
    medium: z.string().nullable().optional(),
    // the saleroom's own currency, as a three letter code; never converted
    currency: z.string().regex(/^[A-Z]{3}$/, "the currency is a three letter code such as GBP"),
    est_low: price, est_high: price, hammer: price, premium: price,
    hammer_basis: z.enum(["published", "calculated"]).nullable().optional(),
    premium_basis: z.enum(["published", "calculated"]).nullable().optional(),
    // every sale needs the lot page or a named database as its source
    source_label: z.string().min(1),
    source_url: z.string().url(),
    source2_label: z.string().optional(),
    source2_url: z.string().url().optional().or(z.literal("")),
  }).passthrough()
    .refine((s) => s.hammer == null || !!s.hammer_basis, { message: "a hammer price needs hammer_basis: published or calculated", path: ["hammer_basis"] })
    .refine((s) => s.est_low == null || s.est_high == null || s.est_low <= s.est_high, { message: "the low estimate is above the high estimate", path: ["est_low"] }),
});

const articles = defineCollection({
  loader: file("data/content.json", { parser: (text) => (JSON.parse(text).features || []).map((x: Record<string, unknown>) => ({ ...x, id: x.slug })) }),
  schema: z.object({
    slug,
    title: z.string().min(1),
    kicker: z.string().optional(),
    standfirst: z.string().optional(),
    description: z.string().optional(),
    body: z.string().min(1),
    tags: z.array(z.string()).default([]),
  }).passthrough(),
});

export const collections = { sales, articles };
