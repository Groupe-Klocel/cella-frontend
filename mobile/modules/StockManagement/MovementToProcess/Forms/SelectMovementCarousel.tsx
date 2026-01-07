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
//DESCRIPTION: select a movement among a list of movements corresponding to a given article and a given location

import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { WrapperForm, WrapperSlide, RadioButtons, ContentSpin } from '@components';
import { showError } from '@helpers';
import { Button, Carousel, Col, Divider, Form, Row, Typography } from 'antd';
import Text from 'antd/lib/typography/Text';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useRouter } from 'next/router';

const { Title } = Typography;
export interface ISelectMovementCarouselProps {
    processName: string;
    stepNumber: number;
    buttons: { [label: string]: any };
}

const StyledTitle = styled(Title)`
    margin: 0 !important;
`;

const SmallStyledButton = styled(Button)`
    background-color: #f4a261 !important;
    box-shadow: inset 0px 1px 0px 0px #f9eca0 !important;
    background: radial-gradient(circle, #f5c73d 70%, #f4a261 100%) !important;
    border: 1px solid #f5c73d !important;
    color: #000000 !important;
    position: absolute !important;
    bottom: 25px;
    font-size: 10px !important;
`;

const CarouselWrapper = styled(Carousel)`
    width: 90%;
    min-height: 130px;
    margin: auto;
    padding-bottom: 5px;
    > .slick-dots-bottom {
        bottom: 2px !important;
    }
    > .slick-dots li button {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: linear-gradient(to bottom, #f4a261 5%, #f5c73d 100%) !important;
    }
`;

const ConditionalWrapperSlide = styled(WrapperSlide)<{ $isAssigned?: boolean }>`
    background-color: ${(props) => (props.$isAssigned ? '#FEF5E1' : '#fef5e185')} !important;
`;

export const SelectMovementCarousel = ({
    processName,
    stepNumber,
    buttons
}: ISelectMovementCarouselProps) => {
    const { t } = useTranslation('common');
    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const { graphqlRequestClient, user } = useAuth();
    const { configs } = useAppState();
    const router = useRouter();

    const [movements, setMovements] = useState<any>([]);
    const [isLoadingMovements, setIsLoadingMovements] = useState<boolean>(true);

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            dispatch({
                type: 'UPDATE_BY_STEP',
                processName,
                stepName: `step${stepNumber}`,
                customFields: [{ key: 'currentStep', value: stepNumber }]
            });
        }
    }, []);

    const configsParamsCodes = useMemo(() => {
        const findCodeByScope = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };

        const toBeProcessedStatusCode = parseInt(
            findCodeByScope(configs, 'movement_status', 'to be processed')
        );
        const inProgressStatusCode = parseInt(
            findCodeByScope(configs, 'movement_status', 'in progress')
        );
        const processingInCourseStatusCode = parseInt(
            findCodeByScope(configs, 'movement_status', 'processing in course')
        );

        return {
            toBeProcessedStatusCode,
            inProgressStatusCode,
            processingInCourseStatusCode
        };
    }, [configs]);

    const fetchMovementsList = async (id?: string) => {
        const movementsListFromGQL = gql`
            query movements(
                $filters: MovementSearchFilters
                $orderBy: [MovementOrderByCriterion!]
                $advancedFilters: [MovementAdvancedSearchFilters!]
                $page: Int
                $itemsPerPage: Int
                $language: String
            ) {
                movements(
                    filters: $filters
                    orderBy: $orderBy
                    advancedFilters: $advancedFilters
                    page: $page
                    itemsPerPage: $itemsPerPage
                    language: $language
                ) {
                    results {
                        id
                        number
                        priority
                        priorityText
                        status
                        stockOwnerIdStr
                        stockOwnerNameStr
                        articleIdStr
                        articleNameStr
                        quantity
                        initialStatusText
                        initialReservation
                        originalLocationIdStr
                        originalLocationNameStr
                        originalHandlingUnitIdStr
                        originalHandlingUnitNameStr
                        originalContentIdStr
                        assignedUser
                        finalLocationIdStr
                        finalLocationNameStr
                        finalHandlingUnitIdStr
                        finalHandlingUnitNameStr
                    }
                }
            }
        `;

        const movementsListVariables = {
            filters: {
                status: [
                    configsParamsCodes.toBeProcessedStatusCode,
                    configsParamsCodes.inProgressStatusCode
                ],
                ...(id && { id })
            },
            advancedFilters: [
                {
                    filter: [
                        { field: { assignedUser: ['**null**'] }, searchType: 'EQUAL' },
                        { field: { assignedUser: [user.username] }, searchType: 'EQUAL' }
                    ]
                }
            ],
            orderBy: [
                { field: 'assignedUser', ascending: true },
                { field: 'priority', ascending: false },
                { field: 'number', ascending: false }
            ],
            page: 1,
            itemsPerPage: 999,
            language: router.locale
        };

        const movementsList_result = await graphqlRequestClient.request(
            movementsListFromGQL,
            movementsListVariables
        );

        return movementsList_result;
    };

    useEffect(() => {
        const fetchAndSetMovements = async () => {
            try {
                setIsLoadingMovements(true);
                const movementsList = await fetchMovementsList();
                const cData = movementsList?.movements?.results;
                console.log('cData', cData);
                if (cData) {
                    setMovements(cData);
                }
            } catch (error) {
                console.error('Error fetching movements list:', error);
            } finally {
                setIsLoadingMovements(false);
            }
        };

        fetchAndSetMovements();
    }, []);

    const [chosenMovementId, setChosenMovementId] = useState<any>();
    useEffect(() => {
        const handleMovementSelection = async () => {
            if (chosenMovementId) {
                try {
                    const movementData = await fetchMovementsList(chosenMovementId);
                    if (movementData?.movements?.results?.length === 0) {
                        showError(t('messages:movement-assigned-meanwhile'));
                        return;
                    }
                    const input: Record<string, any> = {};
                    const data: { [label: string]: any } = {};
                    const selectedMovement = movementData.movements.results[0];

                    // Vérifier si le mouvement doit être assigné à l'utilisateur
                    if (!selectedMovement?.assignedUser) {
                        input['assignedUser'] = user.username;
                    }

                    // Vérifier si le status doit être mis à jour
                    if (selectedMovement?.status === configsParamsCodes.toBeProcessedStatusCode) {
                        input['status'] = configsParamsCodes.inProgressStatusCode;
                    }

                    // Seulement faire la mutation s'il y a quelque chose à mettre à jour
                    if (Object.keys(input).length > 0) {
                        const updateMovementMutation = gql`
                            mutation updateMovement($id: String!, $input: UpdateMovementInput!) {
                                updateMovement(id: $id, input: $input) {
                                    id
                                    status
                                    assignedUser
                                }
                            }
                        `;
                        const updateMovementVariables = {
                            id: selectedMovement?.id,
                            input
                        };
                        try {
                            console.log(
                                'Updating movement with variables:',
                                updateMovementVariables
                            );
                            const updateMovementResult = await graphqlRequestClient.request(
                                updateMovementMutation,
                                updateMovementVariables
                            );
                            console.log('Update result:', updateMovementResult);

                            selectedMovement.assignedUser =
                                updateMovementResult.updateMovement.assignedUser;
                            selectedMovement.status = updateMovementResult.updateMovement.status;

                            data['movement'] = selectedMovement;
                            dispatch({
                                type: 'UPDATE_BY_STEP',
                                processName,
                                stepName: `step${stepNumber}`,
                                object: { ...storedObject[`step${stepNumber}`], data },
                                customFields: [{ key: 'currentStep', value: stepNumber }]
                            });
                        } catch (error) {
                            showError(t('messages:error-updating-movement'));
                            console.log('assignMovementError', error);
                            return;
                        }
                    } else {
                        // Pas de mise à jour nécessaire, juste assigner le mouvement aux données
                        data['movement'] = selectedMovement;
                        dispatch({
                            type: 'UPDATE_BY_STEP',
                            processName,
                            stepName: `step${stepNumber}`,
                            object: { ...storedObject[`step${stepNumber}`], data },
                            customFields: [{ key: 'currentStep', value: stepNumber }]
                        });
                    }
                    storedObject[`step${stepNumber}`] = {
                        ...storedObject[`step${stepNumber}`],
                        data
                    };
                    dispatch({
                        type: 'UPDATE_BY_STEP',
                        processName,
                        stepName: `step${stepNumber}`,
                        object: { ...storedObject[`step${stepNumber}`], data },
                        customFields: [{ key: 'currentStep', value: stepNumber }]
                    });
                } catch (error) {
                    console.error('Error handling movement selection:', error);
                    showError(t('messages:error-updating-movement'));
                }
            }
        };

        handleMovementSelection();
    }, [chosenMovementId]);

    //SelectContentForArticle-3b: handle back to previous step settings
    const onBack = (enforcedPreviousStep?: number) => {
        dispatch({
            type: 'ON_BACK',
            processName,
            stepToReturn: `step${enforcedPreviousStep ?? storedObject[`step${stepNumber}`].previousStep}`
        });
    };

    return (
        <WrapperForm>
            {isLoadingMovements ? (
                <ContentSpin />
            ) : movements ? (
                <CarouselWrapper
                    arrows
                    prevArrow={<LeftOutlined />}
                    nextArrow={<RightOutlined />}
                    style={{ maxWidth: '95%' }}
                >
                    {movements && movements.length >= 1 ? (
                        movements.map((movement: any, index: number, array: any) => (
                            <ConditionalWrapperSlide
                                key={movement.id}
                                $isAssigned={!!movement.assignedUser}
                            >
                                <StyledTitle level={5}>
                                    {t('common:movement')} {index + 1}/{array.length}
                                </StyledTitle>
                                <Divider style={{ margin: 2 }} />
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:movement')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {movement.number}
                                        </Typography>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:priority')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {movement.priorityText}
                                        </Typography>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:assigned-user')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {movement.assignedUser}
                                        </Typography>
                                    </Col>
                                </Row>
                                <Text underline>
                                    {t('common:from').charAt(0).toUpperCase() +
                                        t('common:from').slice(1)}
                                    :
                                </Text>
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:location')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {movement?.originalLocationNameStr}
                                        </Typography>
                                    </Col>
                                </Row>
                                {movement.originalHandlingUnitNameStr ? (
                                    <Row>
                                        <Col span={8}>
                                            <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                                {t('common:handling-unit_abbr')}:
                                            </Typography>
                                        </Col>
                                        <Col span={16}>
                                            <Typography style={{ fontSize: '10px' }}>
                                                {movement?.originalHandlingUnitNameStr}
                                            </Typography>
                                        </Col>
                                    </Row>
                                ) : (
                                    <></>
                                )}
                                {/* Champs détaillés uniquement pour les mouvements non-fullHU */}
                                {movement.articleIdStr && movement.quantity ? (
                                    <>
                                        <Row>
                                            <Col span={8}>
                                                <Typography
                                                    style={{ color: 'grey', fontSize: '10px' }}
                                                >
                                                    {t('common:stock-owner')}:
                                                </Typography>
                                            </Col>
                                            <Col span={16}>
                                                <Typography style={{ fontSize: '10px' }}>
                                                    {movement.stockOwnerNameStr}
                                                </Typography>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Col span={8}>
                                                <Typography
                                                    style={{ color: 'grey', fontSize: '10px' }}
                                                >
                                                    {t('common:article')}:
                                                </Typography>
                                            </Col>
                                            <Col span={16}>
                                                <Typography style={{ fontSize: '10px' }}>
                                                    {movement.articleNameStr}
                                                </Typography>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Col span={8}>
                                                <Typography
                                                    style={{ color: 'grey', fontSize: '10px' }}
                                                >
                                                    {t('common:quantity')}:
                                                </Typography>
                                            </Col>
                                            <Col span={16}>
                                                <Typography style={{ fontSize: '10px' }}>
                                                    {movement.quantity}
                                                </Typography>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Col span={8}>
                                                <Typography
                                                    style={{ color: 'grey', fontSize: '10px' }}
                                                >
                                                    {t('common:stock-status')}:
                                                </Typography>
                                            </Col>
                                            <Col span={16}>
                                                <Typography style={{ fontSize: '10px' }}>
                                                    {movement.initialStatusText}
                                                </Typography>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Col span={8}>
                                                <Typography
                                                    style={{ color: 'grey', fontSize: '10px' }}
                                                >
                                                    {t('common:reservation')}:
                                                </Typography>
                                            </Col>
                                            <Col span={16}>
                                                <Typography style={{ fontSize: '10px' }}>
                                                    {movement.initialReservation}
                                                </Typography>
                                            </Col>
                                        </Row>
                                    </>
                                ) : (
                                    <></>
                                )}
                                <Text underline>
                                    {t('common:to').charAt(0).toUpperCase() +
                                        t('common:to').slice(1)}
                                    :
                                </Text>
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:location')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {movement?.finalLocationNameStr}
                                        </Typography>
                                    </Col>
                                </Row>
                                {movement.finalHandlingUnitNameStr ? (
                                    <Row>
                                        <Col span={8}>
                                            <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                                {t('common:handling-unit_abbr')}:
                                            </Typography>
                                        </Col>
                                        <Col span={16}>
                                            <Typography style={{ fontSize: '10px' }}>
                                                {movement?.finalHandlingUnitNameStr}
                                            </Typography>
                                        </Col>
                                    </Row>
                                ) : (
                                    <></>
                                )}
                                <Form
                                    name="basic"
                                    layout="vertical"
                                    onFinish={() => {
                                        setChosenMovementId(movement.id);
                                    }}
                                    autoComplete="off"
                                    scrollToFirstError
                                    size="small"
                                >
                                    <Row justify="end">
                                        <SmallStyledButton
                                            block
                                            style={{ height: '20px', width: '50vw' }}
                                            htmlType="submit"
                                        >
                                            {t('actions:select')}
                                        </SmallStyledButton>
                                    </Row>
                                </Form>
                            </ConditionalWrapperSlide>
                        ))
                    ) : (
                        <Text type="warning">{t('messages:no-movement')}</Text>
                    )}
                </CarouselWrapper>
            ) : (
                <Text type="warning">{t('messages:no-movement')}</Text>
            )}
            <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
        </WrapperForm>
    );
};
