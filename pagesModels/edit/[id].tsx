/**
CELLA Frontend
Website and Mobile templates that can be used to communicate
with CELLA WMS APIs.
Copyright (C) 2023 KLOCEL <contact@klocel.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
**/
import { AppHead, HeaderContent } from "@components";
import { useRouter } from "next/router";
import { FC, useState } from "react";
import MainLayout from "../../../components/layouts/MainLayout";
import { ObjectToReplaceModelV2 } from "models/ObjectToReplaceModelV2";
import { EditItemComponent } from "modules/Crud/EditItemComponentV2";
import useTranslation from "next-translate/useTranslation";
import { objectToReplacesRoutes } from "modules/ObjectToReplaces/Static/objectToReplacesRoutes";
import { META_DEFAULTS } from "@helpers";

type PageComponent = FC & { layout: typeof MainLayout };

const EditObjectToReplacePage: PageComponent = () => {
  const { t } = useTranslation();

  const router = useRouter();
  const [data, setData] = useState<any>();
  const { id } = router.query;

  const breadsCrumb = [
    ...objectToReplacesRoutes,
    {
      breadcrumbName: `${data?.name}`,
    },
  ];

  return (
    <>
      <AppHead title={META_DEFAULTS.title} />
      <EditItemComponent
        id={id!}
        setData={setData}
        dataModel={ObjectToReplaceModelV2}
        headerComponent={
          <HeaderContent
            title={`${t("common:objectToReplaces")} ${data?.name}`}
            routes={breadsCrumb}
            onBack={() => router.push(`/objectToReplaces/${id}`)}
          />
        }
        routeAfterSuccess={`/objectToReplaces/:id`}
      />
    </>
  );
};

EditObjectToReplacePage.layout = MainLayout;

export default EditObjectToReplacePage;
