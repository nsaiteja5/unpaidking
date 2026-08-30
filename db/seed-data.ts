export interface SeedThrone {
  slug: string;
  category: string;
  kingName: string;
  kingUrl: string;
  definition: string;
  defaultKingXHandle?: string;
  aliases?: string;
}

export const seedThrones: SeedThrone[] = [
  {
    slug: "saas-boilerplates",
    category: "SaaS boilerplates",
    kingName: "ShipFast",
    kingUrl: "https://shipfa.st",
    definition: "Next.js and React boilerplates for building and launching SaaS apps fast.",
    defaultKingXHandle: "marc_louvion",
    aliases: "starter kit, boilerplate, nextjs boilerplate, saas starter",
  },
  {
    slug: "testimonial-tools",
    category: "Testimonial tools",
    kingName: "Senja",
    kingUrl: "https://senja.io",
    definition: "Customer testimonial collection, wall of love widgets, and social proof.",
    defaultKingXHandle: "senja_io",
    aliases: "testimonials, reviews widget, social proof, wall of love",
  },
  {
    slug: "waitlist-tools",
    category: "Waitlist tools",
    kingName: "Viral Loops",
    kingUrl: "https://viral-loops.com",
    definition: "Pre-launch waitlists, viral referral campaigns, and lead milestone widgets.",
    defaultKingXHandle: "viralloops",
    aliases: "waitlist, viral waitlist, referral marketing, prelaunch",
  },
  {
    slug: "feedback-boards",
    category: "Feedback boards",
    kingName: "Canny",
    kingUrl: "https://canny.io",
    definition: "Customer feedback boards, feature voting, public roadmaps, and release notes.",
    defaultKingXHandle: "cannyHQ",
    aliases: "feature requests, user feedback, roadmap voting, feedback board",
  },
  {
    slug: "changelog-tools",
    category: "Changelog tools",
    kingName: "Beamer",
    kingUrl: "https://www.getbeamer.com",
    definition: "Product changelog widgets, in-app notification centers, and announcement bars.",
    defaultKingXHandle: "getbeamer",
    aliases: "changelog, product updates, release notes, in-app notifications",
  },
  {
    slug: "uptime-monitors",
    category: "Uptime monitors",
    kingName: "UptimeRobot",
    kingUrl: "https://uptimerobot.com",
    definition: "Website uptime monitoring, SSL monitoring, and public status pages.",
    defaultKingXHandle: "uptimerobot",
    aliases: "status page, ping monitor, uptime check, heartbeat monitor",
  },
  {
    slug: "affiliate-tracking",
    category: "Affiliate tracking",
    kingName: "Rewardful",
    kingUrl: "https://www.getrewardful.com",
    definition: "Affiliate and referral tracking software for Stripe and SaaS subscriptions.",
    defaultKingXHandle: "rewardful",
    aliases: "affiliate program, referral software, partner tracking, commission software",
  },
  {
    slug: "social-schedulers",
    category: "Social schedulers",
    kingName: "Buffer",
    kingUrl: "https://buffer.com",
    definition: "Social media scheduling, content publishing, and analytics across channels.",
    defaultKingXHandle: "buffer",
    aliases: "social media queue, twitter scheduler, post scheduler, buffer alternative",
  },
];
