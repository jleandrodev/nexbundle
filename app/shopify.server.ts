import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import {
  ESSENTIAL_PLAN,
  PRO_PLAN,
  ENTERPRISE_PLAN,
  PLANS,
  TRIAL_DAYS,
} from "./plans";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  billing: {
    [ESSENTIAL_PLAN]: {
      lineItems: [
        {
          amount: PLANS[0].price,
          currencyCode: PLANS[0].currency,
          interval: BillingInterval.Every30Days,
        },
      ],
      trialDays: TRIAL_DAYS,
    },
    [PRO_PLAN]: {
      lineItems: [
        {
          amount: PLANS[1].price,
          currencyCode: PLANS[1].currency,
          interval: BillingInterval.Every30Days,
        },
      ],
      trialDays: TRIAL_DAYS,
    },
    [ENTERPRISE_PLAN]: {
      lineItems: [
        {
          amount: PLANS[2].price,
          currencyCode: PLANS[2].currency,
          interval: BillingInterval.Every30Days,
        },
      ],
      trialDays: TRIAL_DAYS,
    },
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    // Token offline não-expirável: o App Proxy usa a sessão offline em background.
    // Ver docs/learnings/gotchas.md #9 (evita 401 no unauthenticated/appProxy).
    expiringOfflineAccessTokens: false,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
