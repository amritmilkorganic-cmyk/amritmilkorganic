import blog from "./blog";
import contactQuery from "./contactQuery";
import coupon from "./coupon";
import googleReview from "./googleReview";
import instagramPost from "./instagramPost";
import order from "./order";
import product from "./product";
import siteSettings from "./siteSettings";
import subscription from "./subscription";

export const schemaTypes = [
    product,
    blog,
    order,
    subscription,
    contactQuery,
    instagramPost,
    googleReview,
    coupon,
    siteSettings,
];