import { defineField, defineType } from "sanity";

export default defineType({
    name: "oauthNonce",
    title: "OAuth Nonces",
    type: "document",
    fields: [
        defineField({ name: "nonceHash", type: "string", hidden: true }),
        defineField({ name: "provider", type: "string", hidden: true }),
        defineField({ name: "adminSubjectHash", type: "string", hidden: true }),
        defineField({ name: "expiresAt", type: "datetime", hidden: true }),
        defineField({ name: "usedAt", type: "datetime", hidden: true }),
        defineField({ name: "createdAt", type: "datetime", hidden: true }),
    ],
});
