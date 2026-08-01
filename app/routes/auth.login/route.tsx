import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/node";
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
import { isFramedRequest } from "../../utils/iframe-recovery.server";
import { RECOVER_PATH } from "../../lib/embedded";

import { loginErrorMessage } from "./error.server";

/**
 * Se o iframe do admin cair aqui (algum redirect perdeu shop/host), o form NÃO
 * pode ser renderizado: o submit leva ao OAuth dentro do iframe e o admin mostra
 * "accounts.shopify.com refused to connect". Servimos a página de recuperação.
 */
const FRAME_ESCAPE = `if (window.top !== window.self) { location.replace("${RECOVER_PATH}"); }`;

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const handle = { i18n: ["auth"] };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (isFramedRequest(request)) throw redirect(RECOVER_PATH);

  const errors = loginErrorMessage(await login(request));
  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  return { errors, polarisTranslations: polarisTranslations(locale), locale };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (isFramedRequest(request)) throw redirect(RECOVER_PATH);

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
      <script dangerouslySetInnerHTML={{ __html: FRAME_ESCAPE }} />
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
