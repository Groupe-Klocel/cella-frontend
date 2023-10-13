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
import { FC, useState } from 'react';

export interface IRadioButtonsProps {
    input?: any;
    output?: any;
    submitLoading?: boolean;
    alternativeSubmitLabel?: any;
}

const RadioButtons: FC<IRadioButtonsProps> = ({
    input,
    output,
    submitLoading,
    alternativeSubmitLabel
}: IRadioButtonsProps) => {
    const { t } = useTranslation();
    const [backTrigger, setBackTrigger] = useState<Boolean>(input?.backButton);
    const [locButtonTrigger, setLocButtonTrigger] = useState<Boolean>(input?.locationButton);
    const [emptyButton, setEmptyButton] = useState<Boolean>(input?.emptyButton);
    const [alternativeSubmitButtonTrigger, setAlternativeSubmitButtonTrigger] = useState<Boolean>(
        input?.alternativeSubmit
    );

    const onBack = () => {
        output.onBack();
    };

    return (
        <>
            <WrapperButtons>
                <StyledButton
                    type="primary"
                    block
                    htmlType="submit"
                    hidden={input?.submitButton ? false : true}
                    loading={submitLoading}
                >
                    {t('actions:submit')}
                </StyledButton>
                <StyledButton
                    type="primary"
                    block
                    htmlType="submit"
                    hidden={alternativeSubmitButtonTrigger ? false : true}
                    onClick={() => {
                        output?.setShowAlternativeSubmit(!input?.showAlternativeSubmitButton);
                        setAlternativeSubmitButtonTrigger(!alternativeSubmitButtonTrigger);
                    }}
                    loading={submitLoading}
                >
                    {!input?.showAlternativeSubmitButton
                        ? alternativeSubmitLabel
                        : t('actions:back')}
                </StyledButton>
                {!input.emptyButton ? (
                    <StyledButton
                        type="primary"
                        hidden={emptyButton ? false : true}
                        onClick={() => {
                            output?.setShowEmptyLocations(!input?.showEmptyLocations);
                            output?.setShowSimilarLocations(!input?.showSimilarLocations);
                            output?.setShowSimilarLocations(!input?.showSimilarLocations);
                            setLocButtonTrigger(!locButtonTrigger);
                            setBackTrigger(false);
                        }}
                    >
                        {input?.showSimilarLocations
                            ? t('common:locations-empty_abbr')
                            : t('actions:back')}
                    </StyledButton>
                ) : (
                    <StyledButton
                        type="primary"
                        hidden={emptyButton ? false : true}
                        onClick={() => {
                            output?.setShowEmptyLocations(!input?.showEmptyLocations);
                            setLocButtonTrigger(false);
                            setBackTrigger(true);
                        }}
                    >
                        {!input?.showEmptyLocations
                            ? t('common:locations-empty_abbr')
                            : t('actions:back')}
                    </StyledButton>
                )}
                <StyledButton
                    type="primary"
                    hidden={locButtonTrigger ? false : true}
                    onClick={() => {
                        output?.headerContent.setHeaderContent(!input?.headerContent);
                        output?.setShowSimilarLocations(!input?.showSimilarLocations);
                        setEmptyButton(!emptyButton);
                        setBackTrigger(!backTrigger);
                    }}
                >
                    {!input?.showSimilarLocations ? t('common:locations_abbr') : t('actions:back')}
                </StyledButton>
                <StyledButton
                    type="primary"
                    hidden={backTrigger && !input.showEmptyLocations ? false : true}
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
