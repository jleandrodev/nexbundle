import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  AppProvider as PolarisAppProvider,
  Button,
  Card,
  FormLayout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { useTranslation } from "react-i18next";

import { login } from "../../shopify.server";
import { normalizeLocale } from "../../i18n/config";
import { polarisTranslations } from "../../i18n/polaris.server";

import { loginErrorMessage } from "./error.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const handle = { i18n: ["auth"] };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));
  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  return { errors, polarisTranslations: polarisTranslations(locale), locale };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;
  const { t } = useTranslation("auth");

  return (
    <PolarisAppProvider i18n={loaderData.polarisTranslations}>
      <Page>
        <Card>
          <Form method="post">
            <FormLayout>
              <Text variant="headingMd" as="h2">
                {t("login")}
              </Text>
              <TextField
                type="text"
                name="shop"
                label={t("shopDomain")}
                helpText="example.myshopify.com"
                value={shop}
                onChange={setShop}
                autoComplete="on"
                error={errors.shop}
              />
              <Button submit>{t("login")}</Button>
            </FormLayout>
          </Form>
        </Card>
      </Page>
    </PolarisAppProvider>
  );
}
