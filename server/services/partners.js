const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const partnersPath = path.join(__dirname, "..", "data", "partners.json");

function readPartners() {
  try {
    if (!fs.existsSync(partnersPath)) return [];
    return JSON.parse(fs.readFileSync(partnersPath, "utf8"));
  } catch {
    return [];
  }
}

function writePartners(partners) {
  fs.mkdirSync(path.dirname(partnersPath), { recursive: true });
  fs.writeFileSync(partnersPath, JSON.stringify(partners, null, 2), "utf8");
}

function normalizeCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function generatePartnerCode(name) {
  const base = String(name || "PARTNER")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8);
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return (base || "PARTNER") + suffix;
}

function isCodeTaken(code, partners) {
  return partners.some(function (partner) {
    return partner.code === code;
  });
}

function createUniquePartnerCode(name, partners) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generatePartnerCode(name);
    if (!isCodeTaken(code, partners)) return code;
  }
  return generatePartnerCode(name) + crypto.randomBytes(1).toString("hex").toUpperCase();
}

function findPartnerByCode(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return (
    readPartners().find(function (partner) {
      return partner.code === normalized;
    }) || null
  );
}

function findPartnerByEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return null;
  return (
    readPartners().find(function (partner) {
      return partner.email === normalized;
    }) || null
  );
}

function createPartner(data) {
  const partners = readPartners();
  const email = String(data.email || "").trim().toLowerCase();
  const existing = findPartnerByEmail(email);

  if (existing) {
    return existing;
  }

  const partner = {
    code: createUniquePartnerCode(data.name, partners),
    name: String(data.name || "").trim(),
    email: email,
    telegram: String(data.telegram || "").trim(),
    createdAt: new Date().toISOString(),
  };

  partners.push(partner);
  writePartners(partners);
  return partner;
}

module.exports = {
  createPartner,
  findPartnerByCode,
  findPartnerByEmail,
};
