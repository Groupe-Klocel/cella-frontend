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
import { useHandlingUnitContents, LsIsSecured } from '@helpers';
import { Button, Carousel, Col, Divider, Row, Typography } from 'antd';
import Text from 'antd/lib/typography/Text';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styled from 'styled-components';

const { Title } = Typography;
export interface ISelectContentForHuProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    huId: string;
    headerContent: { [label: string]: any };
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

export const SelectContentForHuForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    huId,
    headerContent: { setHeaderContent }
}: ISelectContentForHuProps) => {
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

    //SelectContentForHu-1: query contents choices related to chosen HU
    const defaultFilter = { handlingUnitId: `${huId}` };
    let filter = defaultFilter;

    const { isLoading, data, error } = useHandlingUnitContents(
        filter,
        1,
        100,
        {
            field: 'handlingUnit_location_category',
            ascending: true
        },
        router.locale
    );

    //SelectContentForHU-2: set contents to provide to carousel
    const [contents, setContents] = useState<any>([]);
    useEffect(() => {
        if (data) {
            if (data?.handlingUnitContents) {
                setContents(data?.handlingUnitContents?.results);
            }
        }
    }, [data]);

    //SelectContentForHu-3: set stored chosenContent once select button is pushed
    const [chosenContent, setChosenContent] = useState<any>();
    useEffect(() => {
        if (chosenContent) {
            const data: { [label: string]: any } = {};
            data['chosenContent'] = contents.find((e: any) => e.id === chosenContent);
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
        }
    }, [chosenContent]);

    //SelectContentForHu-3b: handle back to previous step settings
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (let i = storedObject[`step${stepNumber}`].previousStep; i <= stepNumber; i++) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    console.log('Ctts', contents);

    return (
        <WrapperForm>
            {data && !isLoading ? (
                <CarouselWrapper
                    arrows
                    prevArrow={<LeftOutlined />}
                    nextArrow={<RightOutlined />}
                    style={{ maxWidth: '95%' }}
                >
                    {contents && contents.length >= 1 ? (
                        contents.map((content: any, index: number, array: any) => (
                            <WrapperSlide key={content.id}>
                                <StyledTitle level={5}>
                                    {t('common:content')} {index + 1}/{array.length}
                                </StyledTitle>
                                <Divider style={{ margin: 2 }} />

                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:handling-unit_abbr')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {content.handlingUnit?.name}
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
                                            {content.stockOwner?.name}
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
                                            {content.quantity ? content.quantity : 0}
                                        </Typography>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:article')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {content.article.name}
                                        </Typography>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:status')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {content.stockStatusText}
                                        </Typography>
                                    </Col>
                                </Row>

                                {content.handlingUnitContentFeatures.map(
                                    (huContentFeature: any, index: number) => (
                                        <Row key={index}>
                                            <Col span={8}>
                                                <Typography
                                                    style={{ color: 'grey', fontSize: '10px' }}
                                                >
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
                                )}
                            </WrapperSlide>
                        ))
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
