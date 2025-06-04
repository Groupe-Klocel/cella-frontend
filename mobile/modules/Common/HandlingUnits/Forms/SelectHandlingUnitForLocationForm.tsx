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
import { WrapperForm, WrapperSlide, RadioButtons, HandlingUnitSpin } from '@components';
import { LsIsSecured, useHandlingUnits } from '@helpers';
import { Button, Carousel, Col, Divider, Form, Row, Typography } from 'antd';
import Text from 'antd/lib/typography/Text';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useState } from 'react';
import styled from 'styled-components';

const { Title } = Typography;
export interface ISelectHandlingUnitForLocationProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    locationId: string;
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

export const SelectHandlingUnitForLocationForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    locationId
}: ISelectHandlingUnitForLocationProps) => {
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

    //SelectHandlingUnitForLocation-1: query handing units choices related to chosen location
    const { isLoading, data, error } = useHandlingUnits(
        { locationId: `${locationId}` },
        1,
        100,
        null
    );

    //SelecHandlingUnitForLocation-2: set handling units to provide to carousel
    const [handlingUnits, setHandlingUnits] = useState<any>([]);
    useEffect(() => {
        if (data) {
            if (data?.handlingUnits) {
                setHandlingUnits(data?.handlingUnits?.results);
            }
        }
    }, [data]);

    //SelecHandlingUnitForLocation-3Auto: automatically set stored chosenHandlingUnit when only one handling unit is present
    useEffect(() => {
        if (handlingUnits.length == 1) {
            storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
            delete storedObject[`step${stepNumber}`].previousStep;
            const data: { [label: string]: any } = {};
            data['chosenHandlingUnit'] = handlingUnits[0];
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
        }
    }, [handlingUnits]);

    //SelecHandlingUnitForLocation-3: set stored chosenHandlingUnit once select button is pushed
    const [chosenHandlingUnit, setchosenHandlingUnit] = useState<any>();
    useEffect(() => {
        if (chosenHandlingUnit) {
            const data: { [label: string]: any } = {};
            data['chosenHandlingUnit'] = handlingUnits.find(
                (e: any) => e.id === chosenHandlingUnit
            );
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            storage.set(process, JSON.stringify(storedObject));
            setTriggerRender(!triggerRender);
        }
    }, [chosenHandlingUnit]);

    //SelecHandlingUnitForLocation-3b: handle back to previous step settings
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
                    {handlingUnits && handlingUnits.length >= 1 ? (
                        handlingUnits.map((handlingUnit: any, index: number, array: any) => (
                            <WrapperSlide key={handlingUnit.id}>
                                <StyledTitle level={5}>
                                    {t('common:handling-unit_abbr')} {index + 1}/{array.length}
                                </StyledTitle>
                                <Divider style={{ margin: 2 }} />
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:name')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {handlingUnit.name}
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
                                            {handlingUnit.typeText}
                                        </Typography>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col span={8}>
                                        <Typography style={{ color: 'grey', fontSize: '10px' }}>
                                            {t('common:barcode_abbr')}:
                                        </Typography>
                                    </Col>
                                    <Col span={16}>
                                        <Typography style={{ fontSize: '10px' }}>
                                            {handlingUnit.barcode}
                                        </Typography>
                                    </Col>
                                </Row>
                                <Form
                                    name="basic"
                                    layout="vertical"
                                    onFinish={() => {
                                        setchosenHandlingUnit(handlingUnit.id);
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
                        <Text type="warning">{t('messages:no-handling-unit')}</Text>
                    )}
                </CarouselWrapper>
            ) : (
                <HandlingUnitSpin />
            )}
            <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
        </WrapperForm>
    );
};
