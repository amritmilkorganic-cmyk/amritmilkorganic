import { defineField, defineType } from "sanity";

export default defineType({
    name: "adminLoginAudit",
    title: "Administrator Login Audit",
    type: "document",
    fields: [
        defineField({
            name: "outcome",
            title: "Outcome",
            type: "string",
            options: { list: ["succeeded", "failed", "rate_limited"] },
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: "occurredAt",
            title: "Occurred at",
            type: "datetime",
            validation: (rule) => rule.required(),
        }),
        defineField({
            name: "ipHash",
            title: "IP digest",
            type: "string",
            readOnly: true,
            hidden: true,
        }),
        defineField({
            name: "principalHash",
            title: "Principal digest",
            type: "string",
            readOnly: true,
            hidden: true,
        }),
    ],
    preview: { select: { title: "outcome", subtitle: "occurredAt" } },
});
