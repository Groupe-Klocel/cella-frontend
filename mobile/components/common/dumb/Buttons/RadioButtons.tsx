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
import { WrapperButtons, StyledButton } from '@components';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';

export interface IRadioButtonsProps {
    input?: any;
    output?: any;
    submitLoading?: boolean;
    alternativeSubmitLabel?: any;
    alternativeSubmitLabel1?: any;
    action1Label?: any;
}

const RadioButtons: FC<IRadioButtonsProps> = ({
    input,
    output,
    submitLoading,
    alternativeSubmitLabel,
    alternativeSubmitLabel1,
    action1Label
}: IRadioButtonsProps) => {
    const { t } = useTranslation();
    const [backTrigger, setBackTrigger] = useState<Boolean>(input?.backButton);
    const [locButtonTrigger, setLocButtonTrigger] = useState<Boolean>(false);
    const [emptyButton, setEmptyButton] = useState<Boolean>(false);
    const [alternativeSubmitButtonTrigger, setAlternativeSubmitButtonTrigger] = useState<Boolean>(
        input?.alternativeSubmitButton
    );
    const [alternativeSubmitButtonTrigger1, setAlternativeSubmitButtonTrigger1] = useState<Boolean>(
        input?.alternativeSubmitButton1
    );
    const [action1ButtonTrigger, setAction1ButtonTrigger] = useState<Boolean>(input?.action1Button);
    const [action1ButtonVisible, setAction1ButtonVisible] = useState<Boolean>(false);

    // NB: commented for later enhancement
    // const [disabled, setDisabled] = useState<boolean | undefined>(false);

    const onBack = () => {
        output.onBack();
    };

    // console.log('RADIOBTN_action1ButtonTrigger', action1ButtonTrigger);
    // console.log('RADIOBTN_action1Trigger', input.action1Trigger);

    //This allows action1 button display to be dynamically re-rendered
    useEffect(() => {
        setAction1ButtonVisible(input?.action1Button);
    }, [input?.action1Button]);

    return (
        <>
            <WrapperButtons>
                <StyledButton
                    type="primary"
                    block
                    htmlType="submit"
                    hidden={input?.submitButton ? false : true}
                    // onClick={() => {
                    //     setDisabled(true);
                    // }}
                    loading={submitLoading}
                    // disabled={disabled}
                >
                    {t('actions:submit')}
                </StyledButton>
                <StyledButton
                    type="primary"
                    block
                    htmlType="submit"
                    hidden={alternativeSubmitButtonTrigger ? false : true}
                    onClick={() => {
                        // setDisabled(true);
                        output?.setTriggerAlternativeSubmit(!input?.triggerAlternativeSubmit);
                        // setAlternativeSubmitButtonTrigger(!alternativeSubmitButtonTrigger);
                    }}
                    loading={submitLoading}
                    // disabled={disabled}
                >
                    {!input?.triggerAlternativeSubmitButton
                        ? alternativeSubmitLabel
                        : t('actions:back')}
                </StyledButton>
                <StyledButton
                    type="primary"
                    block
                    hidden={alternativeSubmitButtonTrigger1 ? false : true}
                    onClick={() => {
                        // setDisabled(true);
                        output?.setTriggerAlternativeSubmit1(!input?.triggerAlternativeSubmit1);
                        // setAlternativeSubmitButtonTrigger1(!alternativeSubmitButtonTrigger1);
                    }}
                    loading={submitLoading}
                    // disabled={disabled}
                >
                    {!input?.triggerAlternativeSubmitButton1
                        ? alternativeSubmitLabel1
                        : t('actions:back')}
                </StyledButton>

                {/* Case where both buttons are used */}
                {input.emptyButton && input.locationButton ? (
                    emptyButton ? (
                        <StyledButton
                            type="primary"
                            hidden={emptyButton ? false : true}
                            onClick={() => {
                                output?.setShowSimilarLocations(!input?.showSimilarLocations);
                                output?.setShowEmptyLocations(!input?.showEmptyLocations);
                                setBackTrigger(!backTrigger);
                                setEmptyButton(!emptyButton);
                                setLocButtonTrigger(!locButtonTrigger);
                            }}
                        >
                            {!input?.showEmptyLocations
                                ? t('common:locations-empty_abbr')
                                : t('actions:back')}
                        </StyledButton>
                    ) : (
                        <StyledButton
                            type="primary"
                            hidden={locButtonTrigger ? false : true}
                            onClick={() => {
                                output?.setShowSimilarLocations(!input?.showSimilarLocations);
                                output?.setShowEmptyLocations(!input?.showEmptyLocations);
                                setBackTrigger(!backTrigger);
                                setEmptyButton(!emptyButton);
                                setLocButtonTrigger(!locButtonTrigger);
                            }}
                        >
                            {!input?.showEmptyLocations
                                ? t('common:locations_abbr')
                                : t('actions:back')}
                        </StyledButton>
                    )
                ) : // button similar location only
                input.locationButton ? (
                    <StyledButton
                        type="primary"
                        hidden={!input.locationButton ? true : false}
                        onClick={() => {
                            output?.headerContent.setHeaderContent(!input?.headerContent);
                            output?.setShowSimilarLocations(!input?.showSimilarLocations);
                            !input.emptyButton
                                ? output?.setShowEmptyLocations(false)
                                : output?.setShowEmptyLocations(!input?.showEmptyLocations);
                            setBackTrigger(!backTrigger);
                        }}
                    >
                        {!input?.showSimilarLocations
                            ? t('common:locations_abbr')
                            : t('actions:back')}
                    </StyledButton>
                ) : (
                    // button empty location only
                    <StyledButton
                        type="primary"
                        hidden={!input.emptyButton ? true : false}
                        onClick={() => {
                            output?.setShowEmptyLocations(!input?.showEmptyLocations);
                            !input.locationButton
                                ? output?.setShowSimilarLocations(false)
                                : output?.setShowSimilarLocations(!input?.showSimilarLocations);
                            setBackTrigger(!backTrigger);
                        }}
                    >
                        {!input?.showEmptyLocations
                            ? t('common:locations-empty_abbr')
                            : t('actions:back')}
                    </StyledButton>
                )}

                {/* button similar location shown when empty button and location button are used at the same time */}
                <StyledButton
                    type="primary"
                    hidden={
                        !locButtonTrigger && input.emptyButton && input.locationButton
                            ? false
                            : true
                    }
                    onClick={() => {
                        output?.headerContent.setHeaderContent(!input?.headerContent);
                        output?.setShowSimilarLocations(!input?.showSimilarLocations);
                        setEmptyButton(!emptyButton);
                        setBackTrigger(!backTrigger);
                        setLocButtonTrigger(false);
                    }}
                >
                    {!input?.showSimilarLocations ? t('common:locations_abbr') : t('actions:back')}
                </StyledButton>

                {/* ?? */}
                <StyledButton
                    type="primary"
                    block
                    hidden={action1ButtonVisible ? false : true}
                    onClick={() => {
                        // setDisabled(true);
                        output?.setAction1Trigger(!input?.action1Trigger);
                        setAction1ButtonTrigger(!action1ButtonTrigger);
                    }}
                    loading={submitLoading}
                    // disabled={disabled}
                >
                    {action1Label ?? 'Action'}
                </StyledButton>

                {/* btn back */}
                <StyledButton
                    type="primary"
                    hidden={
                        backTrigger && !input.showEmptyLocations && !input.showSimilarLocations
                            ? false
                            : true
                    }
                    onClick={onBack}
                >
                    {t('actions:back')}
                </StyledButton>
            </WrapperButtons>
        </>
    );
};

RadioButtons.displayName = 'RadioButtons';

export { RadioButtons };
