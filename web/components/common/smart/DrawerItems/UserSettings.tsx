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
import { ThemeSwitch } from 'components/common/smart/Switchs/ThemeSwitch';
import { MenuSwitch } from 'components/common/smart/Switchs/MenuSwitch';
import { Row, Col, Divider } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { LanguageSelector } from 'components/common/smart/LanguageSelector/LanguageSelector';

export const UserSettings = () => {
    const { t } = useTranslation();

    return (
        <>
            <Divider orientation="left"></Divider>
            <Row justify="space-between">
                <Col>{t('common:language')}</Col>
                <Col>
                    <LanguageSelector />
                </Col>
            </Row>
            <Divider orientation="left">{t('common:menu')}</Divider>
            <Row justify="space-between">
                <Col>{t('actions:collapse-menu')}</Col>
                <Col>
                    <MenuSwitch />
                </Col>
            </Row>
            <Divider orientation="left">{t('common:theme-settings')}</Divider>
            <Row justify="space-between">
                <Col>{t('actions:dark-mode')}</Col>
                <Col>
                    <ThemeSwitch />
                </Col>
            </Row>
        </>
    );
};
