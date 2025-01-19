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
import { LsIsSecured, useHandlingUnits } from '@helpers';
import { Button, Carousel, Col, Divider, Form, Row, Typography } from 'antd';
import Text from 'antd/lib/typography/Text';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styled from 'styled-components';

const { Title } = Typography;
export interface ISelectChildHuForHuProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    huId: string;
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

export const SelectChildHuForHuForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    huId
}: ISelectChildHuForHuProps) => {
    const { t } = useTranslation('common');
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '[]');

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

    //SelectChildHuForHu-1: query contents choices related to chosen HU
    const defaultFilter = { id: `${huId}` };
    let filter = defaultFilter;

    const { isLoading, data, error } = useHandlingUnits(filter, 1, 100, {
        field: 'name',
        ascending: true
    });

    //SelectChildHuForHU-2: set contents to provide to carousel
    const [childHus, setChildHus] = useState<any>([]);
    useEffect(() => {
        if (data) {
            if (data?.handlingUnits) {
                setChildHus(data?.handlingUnits?.results[0].childrenHandlingUnits);
            }
        }
    }, [data]);

    // //SelectChildHuForHu-3: set stored chosenContent once select button is pushed
    const [chosenChildHu, setChosenChildHu] = useState<any>();
    useEffect(() => {
        if (chosenChildHu) {
            const data: { [label: string]: any } = {};
            data['chosenChildHu'] = childHus.find((e: any) => e.id === chosenChildHu);
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
        }
    }, [chosenChildHu]);

    //SelectChildHuForHu-3b: handle back to previous step settings
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
                    {childHus && childHus.count !== 0 ? (
                        childHus.map((childHu: any, index: number, array: any) => (
                            <WrapperSlide key={childHu.id}>
                                <StyledTitle level={3}>
                                    {t('common:child-handling-unit')} {index + 1}/{array.length}
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
                                            {childHu.name}
                                        </Typography>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:type')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {childHu.typeText}
                                        </Typography>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:category')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {childHu.categoryText}
                                        </Typography>
                                    </Col>
                                </Row>
                                <Form
                                    name="basic"
                                    layout="vertical"
                                    onFinish={() => {
                                        setChosenChildHu(childHu.id);
                                    }}
                                    autoComplete="off"
                                    scrollToFirstError
                                    size="small"
                                >
                                    <Row justify="center">
                                        <SmallStyledButton
                                            block
                                            style={{ height: '20px', width: '50vw' }}
                                            htmlType="submit"
                                        >
                                            {t('actions:select')}
                                        </SmallStyledButton>
                                    </Row>
                                </Form>
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
