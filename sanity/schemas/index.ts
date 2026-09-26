import blog from "./blog";
import contactQuery from "./contactQuery";
import coupon from "./coupon";
import customerAccount from "./customerAccount";
import oauthNonce from "./oauthNonce";
import googleReview from "./googleReview";
import instagramPost from "./instagramPost";
import order from "./order";
import product from "./product";
import siteSettings from "./siteSettings";
import subscription from "./subscription";
import adminLoginAudit from "./adminLoginAudit";

export const schemaTypes = [
    adminLoginAudit,
    product,
    blog,
    order,
    subscription,
    customerAccount,
    oauthNonce,
    contactQuery,
    instagramPost,
    googleReview,
    coupon,
    siteSettings,
];
