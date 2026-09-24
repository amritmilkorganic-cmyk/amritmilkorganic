export type SanityReader = {
    fetch: (query: string, params: Record<string, unknown>) => Promise<any>;
};

export function canonicalPhone(value: unknown): string {
    return String(value || "")
        .replace(/\D/g, "")
        .slice(-10);
}

export async function findUniqueCustomerAccount(
    client: SanityReader,
    phone: unknown,
    projection = "_id, phone, canonicalPhone"
): Promise<{ account: any | null; ambiguous: boolean }> {
    const canonical = canonicalPhone(phone);
    if (canonical.length !== 10) return { account: null, ambiguous: false };

    const canonicalMatches = await client.fetch(
        `*[_type == "customerAccount" && canonicalPhone == $canonical]{${projection}}`,
        { canonical }
    );
    // Legacy accounts predate canonicalPhone. Fetch only those records, normalize in
    // application code, and refuse duplicates rather than selecting an arbitrary account.
    const legacyCandidates = await client.fetch(
        `*[_type == "customerAccount" && !defined(canonicalPhone)]{${projection}}`,
        { canonical }
    );
    const exactLegacyMatches = legacyCandidates.filter(
        (candidate: any) => canonicalPhone(candidate.phone) === canonical
    );
    const matches = [...canonicalMatches, ...exactLegacyMatches].filter(
        (candidate, index, all) => all.findIndex((item) => item._id === candidate._id) === index
    );
    if (matches.length > 1) return { account: null, ambiguous: true };
    return { account: matches[0] || null, ambiguous: false };
}
