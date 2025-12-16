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

function findSupplierArticleCode(processName: string, storedObject: any) {
    switch (processName) {
        case 'pickAndPack':
            if (storedObject[`step50`]?.data) {
                const article =
                    storedObject['step50']?.data?.article ??
                    storedObject?.step10?.data?.proposedRoundAdvisedAddresses[0].handlingUnitContent
                        .article;
                return {
                    supplierArticleCode: article?.genericArticleComment,
                    articleName: article?.name
                };
            } else {
                const proposedRoundAdvisedAddress =
                    storedObject?.step10?.data?.proposedRoundAdvisedAddresses[0];
                if (proposedRoundAdvisedAddress?.handlingUnitContent?.article) {
                    const article = proposedRoundAdvisedAddress.handlingUnitContent.article;
                    return {
                        supplierArticleCode: article?.genericArticleComment,
                        articleName: article?.name
                    };
                }
            }
            break;
        case 'reception':
        case 'receptionReturn':
            if (storedObject[`step50`]?.data) {
                const receptionArticle =
                    storedObject['step50']?.data?.chosenArticleLuBarcode?.article;
                return {
                    supplierArticleCode: receptionArticle?.genericArticleComment,
                    articleName: `${receptionArticle?.name}-${receptionArticle?.description}`
                };
            }
            break;
        case 'articleInfo':
            if (storedObject[`step20`]?.data) {
                const articleInfoArticle =
                    storedObject['step20']?.data?.chosenArticleLuBarcode?.article;
                return {
                    supplierArticleCode: articleInfoArticle?.genericArticleComment,
                    articleName:
                        articleInfoArticle?.name +
                        ' (' +
                        storedObject['step20']?.data?.chosenArticleLuBarcode?.stockOwner?.name +
                        ')'
                };
            }
            break;
        case 'roundPicking':
            const proposedRoundAdvisedAddress =
                storedObject['step10']?.data?.proposedRoundAdvisedAddress;
            const roundPickingArticle = proposedRoundAdvisedAddress.handlingUnitContent?.article;
            return {
                supplierArticleCode: roundPickingArticle?.genericArticleComment,
                articleName: roundPickingArticle?.name
            };
            break;
        case 'roundPacking':
            if (storedObject[`step30`]?.data) {
                const roundPackingArticle = storedObject[`step30`]?.data?.article;
                const serialNumber = storedObject[`step30`]?.data?.feature?.value ?? undefined;
                const roundPackingArticleName = serialNumber
                    ? '1 x ' + roundPackingArticle.name + ' / ' + serialNumber
                    : roundPackingArticle.name;
                return {
                    supplierArticleCode: roundPackingArticle?.genericArticleComment,
                    articleName: roundPackingArticleName
                };
            }
            break;
        case 'contentMvtReception':
        case 'contentMvt':
            if (storedObject[`step35`]?.data) {
                const articleLuBarcode = storedObject['step35']?.data?.chosenArticleLuBarcode;
                const stockOwnerName = articleLuBarcode?.stockOwner?.name ?? undefined;
                const contentMvtArticle = articleLuBarcode.article
                    ? articleLuBarcode.article
                    : articleLuBarcode;
                const contentMvtArticleName = stockOwnerName
                    ? contentMvtArticle.name + ' (' + stockOwnerName + ')'
                    : contentMvtArticle.name;
                return {
                    supplierArticleCode: contentMvtArticle?.genericArticleComment,
                    articleName: contentMvtArticleName
                };
            }
            break;
        case 'boxPreparation':
            if (storedObject[`step30`]?.data) {
                const articleLuBarcode = storedObject[`step30`]?.data?.articleLuBarcode;
                return {
                    supplierArticleCode: articleLuBarcode.article?.genericArticleComment,
                    articleName: articleLuBarcode.article.name
                };
            }
            break;
        case 'cycleCounts':
            if (storedObject[`step55`]?.data) {
                const article = storedObject['step55']?.data?.article;
                const serialNumber = storedObject['step40']?.data?.feature?.value ?? undefined;
                let cycleCountArticleName = serialNumber
                    ? '1 x ' + article.name + ' / ' + serialNumber
                    : article.name;
                if (
                    storedObject['step40']?.data?.resType === 'barcode' &&
                    storedObject['step70']?.data?.movingQuantity
                ) {
                    const movingQuantity = storedObject['step70']?.data?.movingQuantity;
                    cycleCountArticleName = movingQuantity + ' x ' + article.name;
                }
                return {
                    supplierArticleCode: article?.genericArticleComment,
                    articleName: cycleCountArticleName
                };
            }
            break;
        case 'huMvt':
            if (storedObject['step20']?.data) {
                const originalHu = storedObject['step20']?.data?.handlingUnit;
                return {
                    supplierArticleCode:
                        originalHu.handlingUnitContents.length > 0
                            ? originalHu.handlingUnitContents[0].article.genericArticleComment
                            : null,
                    articleName:
                        originalHu.handlingUnitContents.length > 0
                            ? originalHu.handlingUnitContents[0].article.name
                            : null
                };
            }
            break;
        case 'initStock':
            if (storedObject['step40']?.data) {
                const article = storedObject['step40']?.data?.articleLuBarcodesInfos[0].article;
                return {
                    supplierArticleCode: article?.genericArticleComment,
                    articleName: article?.name
                };
            }
            break;
        // Add more cases here for different process names if needed
        default:
            return { supplierArticleCode: null, articleName: null };
    }
}

export function getMoreInfos(headerDisplay: any, storedObject: any, processName: string, t: any) {
    if (!storedObject['step10']) {
        return headerDisplay;
    }
    // #region Add Supplier Article Code
    const { supplierArticleCode, articleName } = findSupplierArticleCode(
        processName,
        storedObject
    ) ?? { supplierArticleCode: null, articleName: null };
    // Insert supplierArticleCode just under the value Article name
    if (articleName) {
        const entries = Object.entries(headerDisplay);
        const targetIndex = entries.findIndex(([key, value]) => value === articleName);
        const insertIndex = targetIndex >= 0 ? targetIndex + 1 : entries.length;
        entries.splice(insertIndex, 0, [
            t('common:supplier-article-code'),
            supplierArticleCode ?? ''
        ]);
        headerDisplay = Object.fromEntries(entries);
    }
    // #endregion
    return headerDisplay;
}
