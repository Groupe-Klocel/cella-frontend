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
//DESCRIPTION: single source of truth for "which article is this pick about" in the Pick&Pack flow.
//
// A round advised address carries the article three times:
//   - roundLineDetail.deliveryLine.articleId : what the customer ordered (order truth)
//   - roundLineDetail.roundLine.articleId    : mirrors the delivery line
//   - handlingUnitContentId / handlingUnitContent : the advised stock, a *hint* that is rewritten
//     in bulk by changePRAA() and can end up pointing at another article than the delivery line.
// Every check of the flow must resolve the article the same way, otherwise a step accepts a
// location/HU that the next one refuses (operator dead-end on a correct location).

export const getExpectedArticleId = (proposedRoundAdvisedAddress: any) =>
    proposedRoundAdvisedAddress?.roundLineDetail?.deliveryLine?.articleId ??
    proposedRoundAdvisedAddress?.roundLineDetail?.roundLine?.articleId ??
    proposedRoundAdvisedAddress?.handlingUnitContent?.articleId ??
    proposedRoundAdvisedAddress?.handlingUnitContent?.article?.id;

// Article to display (name, description, supplier code, master barcode). Same order of trust as
// getExpectedArticleId: the round line mirrors the delivery line, the advised content is a fallback
// for the payloads that do not embark the round line article (backend executeFunction outputs).
export const getExpectedArticle = (proposedRoundAdvisedAddress: any) =>
    proposedRoundAdvisedAddress?.roundLineDetail?.roundLine?.article ??
    proposedRoundAdvisedAddress?.handlingUnitContent?.article;

// Does this handling unit content feed the line the operator is on?
//
// The location step (20), the level step (30) and the handling unit step (40) all have to answer
// that question the same way. They did not: step 20 accepted a location as soon as it held the
// article, whatever its quantity, while step 30 required a content with `quantity > 0`. Both steps
// are automatic when the round advises a location (the location is enforced, and a single location
// is auto-selected), and step 30 answers a refusal with an ON_BACK to step 20 - so an advised
// location whose stock had fallen to 0 made the two steps hand the operator back and forth
// forever, spamming "unexpected scanned item". Judging the stock in one place is what closes that
// cycle: whatever step 20 accepts, step 30 accepts.
//
// The rule itself: the article of the line, its stock owner / stock status / reservation when the
// payload embarks the delivery line, and something left to pick. A content at 0 (line picked by
// somebody else, stock moved away) holds nothing for this round.
export const isContentOfExpectedLine = (proposedRoundAdvisedAddress: any) => {
    const expectedArticleId = getExpectedArticleId(proposedRoundAdvisedAddress);
    const deliveryLine = proposedRoundAdvisedAddress?.roundLineDetail?.deliveryLine;

    return (content: any): boolean => {
        if (!content || !expectedArticleId) return false;
        if ((content.articleId ?? content.article?.id) != expectedArticleId) return false;
        // The delivery line is absent from the payloads rebuilt from an executeFunction output
        // (see getExpectedArticleId): there is nothing to compare the owner, the status and the
        // reservation with, and refusing every content on a missing reference would dead-end the
        // line instead of checking it.
        if (
            deliveryLine &&
            (deliveryLine.stockOwnerId !== content.stockOwnerId ||
                deliveryLine.stockStatus !== content.stockStatus ||
                deliveryLine.reservation !== content.reservation)
        ) {
            return false;
        }
        return content.quantity > 0;
    };
};

// Quantity left to pick for the line in the given locations - what the location step displays next
// to its label, and what it now requires to let the operator through.
export const pickableQuantityInLocations = (
    locations: any[] | undefined,
    proposedRoundAdvisedAddress: any
): number => {
    const isExpectedContent = isContentOfExpectedLine(proposedRoundAdvisedAddress);

    return (locations ?? []).reduce(
        (total: number, location: any) =>
            total +
            (location?.handlingUnits ?? []).reduce(
                (huTotal: number, hu: any) =>
                    huTotal +
                    (hu?.handlingUnitContents ?? [])
                        .filter(isExpectedContent)
                        .reduce((sum: number, content: any) => sum + content.quantity, 0),
                0
            ),
        0
    );
};
