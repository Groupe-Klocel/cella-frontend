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
//DESCRIPTION: select a content among a list of contents corresponding to a given article and a given location

import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { WrapperForm, WrapperSlide, RadioButtons, ContentSpin } from '@components';
import { useHandlingUnitContents, LsIsSecured, useHandlingUnitContentFeatures } from '@helpers';
import { Button, Carousel, Col, Divider, Form, Row, Typography } from 'antd';
import Text from 'antd/lib/typography/Text';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styled from 'styled-components';

const { Title } = Typography;
export interface IDisplayContentByArticleSerialProps {
    process: string;
    stepNumber: number;
    uniqueId: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    hideSelect?: boolean;
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

export const DisplayContentByArticleSerialForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    uniqueId,
    buttons,
    hideSelect
}: IDisplayContentByArticleSerialProps) => {
    const { t } = useTranslation('common');
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '[]');
    const router = useRouter();

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    //DisplayContentByArticleSerial-1: query contents choices related to sent uniqueId article
    const { isLoading, data } = useHandlingUnitContentFeatures(
        { value: uniqueId },
        1,
        100,
        null,
        router.locale
    );

    //DisplayContentByArticleSerial-2: set contents to provide to carousel
    const [contentFeature, setContentFeature] = useState<any>();
    useEffect(() => {
        if (data) {
            if (data?.handlingUnitContentFeatures) {
                setContentFeature(data?.handlingUnitContentFeatures?.results[0]);
            }
        }
    }, [data]);

    //DisplayContentByArticleSerial-3b: handle back to previous step settings
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`].previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    return (
        <WrapperForm>
            {data && !isLoading ? (
                <CarouselWrapper
                    arrows
                    prevArrow={<LeftOutlined />}
                    nextArrow={<RightOutlined />}
                    style={{ maxWidth: '95%' }}
                >
                    {contentFeature ? (
                        <WrapperSlide key={contentFeature.handlingUnitContentId}>
                            <StyledTitle level={5}>{t('common:content')}</StyledTitle>
                            <Divider style={{ margin: 2 }} />
                            <Row>
                                <Col span={8}>
                                    <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                        {t('common:handling-unit-parent_abbr')}:
                                    </Typography>
                                </Col>
                                <Col span={16}>
                                    <Typography style={{ fontSize: '10px' }}>
                                        {
                                            contentFeature.handlingUnitContent.handlingUnit
                                                ?.parentHandlingUnit?.name
                                        }
                                    </Typography>
                                </Col>
                            </Row>
                            <Row>
                                <Col span={8}>
                                    <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                        {t('common:handling-unit_abbr')}:
                                    </Typography>
                                </Col>
                                <Col span={16}>
                                    <Typography style={{ fontSize: '10px' }}>
                                        {contentFeature.handlingUnitContent.handlingUnit?.name}
                                    </Typography>
                                </Col>
                            </Row>
                            <Row>
                                <Col span={8}>
                                    <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                        {t('common:stock-owner')}:
                                    </Typography>
                                </Col>
                                <Col span={16}>
                                    <Typography style={{ fontSize: '10px' }}>
                                        {contentFeature.handlingUnitContent.stockOwner?.name}
                                    </Typography>
                                </Col>
                            </Row>
                            <Row>
                                <Col span={8}>
                                    <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                        {t('common:quantity')}:
                                    </Typography>
                                </Col>
                                <Col span={16}>
                                    <Typography style={{ fontSize: '10px' }}>
                                        {contentFeature.handlingUnitContent.quantity
                                            ? contentFeature.handlingUnitContent.quantity
                                            : 1}
                                    </Typography>
                                </Col>
                            </Row>
                            <Row>
                                <Col span={8}>
                                    <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                        {t('common:stock-status')}:
                                    </Typography>
                                </Col>
                                <Col span={16}>
                                    <Typography style={{ fontSize: '10px' }}>
                                        {contentFeature.handlingUnitContent.stockStatusText}
                                    </Typography>
                                </Col>
                            </Row>
                            {!hideSelect ? (
                                <></>
                            ) : (
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:location')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {
                                                contentFeature.handlingUnitContent?.handlingUnit
                                                    ?.location?.name
                                            }
                                        </Typography>
                                    </Col>
                                </Row>
                            )}
                            {!hideSelect ? (
                                <></>
                            ) : (
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:category')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {
                                                contentFeature.handlingUnitContent?.handlingUnit
                                                    ?.location?.categoryText
                                            }
                                        </Typography>
                                    </Col>
                                </Row>
                            )}
                            {/* Need decision on approach to display or not other ids
                            {content.handlingUnitContentFeatures.map(
                                (huContentFeature: any, index: number) => (
                                    <Row key={index}>
                                        <Col span={8}>
                                            <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                                {huContentFeature.featureCode.name}:
                                            </Typography>
                                        </Col>
                                        <Col span={16}>
                                            <Typography style={{ fontSize: '10px' }}>
                                                {huContentFeature.value}
                                            </Typography>
                                        </Col>
                                    </Row>
                                )
                            )} */}
                        </WrapperSlide>
                    ) : (
                        <Text type="warning">{t('messages:no-content')}</Text>
                    )}
                </CarouselWrapper>
            ) : (
                <ContentSpin />
            )}
            <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
        </WrapperForm>
    );
};
