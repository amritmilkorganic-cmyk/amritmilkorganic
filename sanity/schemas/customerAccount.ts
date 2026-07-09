import { defineField, defineType } from "sanity";

export default defineType({
    name: "customerAccount",
    title: "Customer Accounts",
    type: "document",

    fields: [
        defineField({
            name: "name",
            title: "Customer Name",
            type: "string",
        }),

        defineField({
            name: "phone",
            title: "Phone Number",
            type: "string",
            validation: (Rule) => Rule.required(),
        }),

        defineField({
            name: "email",
            title: "Email",
            type: "string",
        }),

        defineField({
            name: "passwordHash",
            title: "Password Hash",
            type: "string",
            hidden: true,
        }),

        defineField({
            name: "resetTokenHash",
            title: "Reset Token Hash",
            type: "string",
            hidden: true,
        }),

        defineField({
            name: "resetTokenExpiresAt",
            title: "Reset Token Expires At",
            type: "datetime",
            hidden: true,
        }),

        defineField({
            name: "isActive",
            title: "Account Active",
            type: "boolean",
            initialValue: true,
        }),

        defineField({
            name: "createdAt",
            title: "Created At",
            type: "datetime",
        }),

        defineField({
            name: "updatedAt",
            title: "Updated At",
            type: "datetime",
        }),
    ],

    preview: {
        select: {
            title: "name",
            subtitle: "phone",
        },
    },
});