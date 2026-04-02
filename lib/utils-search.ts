export function parseCreatorLink(input: string): {
  name: string;
  service?: string;
} {
  const urlPattern =
    /^(https?:\/\/)?(www\.)?(onlyfans\.com|fansly\.com|patreon\.com|fanbox\.cc|subscribestar\.adult|gumroad\.com|candfans\.jp)\/([a-zA-Z0-9._-]+)/i;
  const match = input.match(urlPattern);

  if (match) {
    const domain = match[3].toLowerCase();
    const username = match[4];

    let service = "";
    if (domain.includes("onlyfans")) service = "onlyfans";
    else if (domain.includes("fansly")) service = "fansly";
    else if (domain.includes("patreon")) service = "patreon";
    else if (domain.includes("fanbox")) service = "fanbox";
    else if (domain.includes("subscribestar")) service = "subscribestar";
    else if (domain.includes("gumroad")) service = "gumroad";
    else if (domain.includes("candfans")) service = "candfans";

    return { name: username, service };
  }

  return { name: input };
}
