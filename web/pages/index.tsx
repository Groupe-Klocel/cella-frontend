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
import {
    AppstoreOutlined,
    HistoryOutlined,
    RightOutlined,
    StarFilled,
    StarOutlined
} from '@ant-design/icons';
import { AppHead, SideMenuAutoComplete } from '@components';
import {
    isNumeric,
    resetBreadcrumbTrailOnNavigation,
    showError,
    SideMenuEntry,
    SideMenuSection,
    useRecentPages,
    useSideMenuSections
} from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Avatar, Card, Col, Row, Space, Typography } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FC, KeyboardEvent, MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';

const { Title, Text } = Typography;

type PageComponent = FC & { layout: typeof MainLayout };

/**
 * The home page: the welcome sentence, a search box over every screen, the sections of the side
 * menu (closed by default — pick one to see its screens), and the user's recently visited pages
 * and favourites. Everything derives from what `SideMenu` publishes (`useSideMenuSections`), so
 * permissions and customer menus are honoured for free. Leaving the page from here behaves like a
 * side-menu click: the breadcrumb trail starts over on the destination.
 *
 * Labels are DB translations (`common:recently-visited`, `common:favourites`, …): create the rows
 * for the four languages when deploying.
 */

// --------------------------------------------------------------------------------------- motion
// Pure CSS, no dependency: a spring-like easing, chips fading up one after the other, rotating
// chevrons, hover lifts. Switched off for users who asked their system for reduced motion.

const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

// one colour per section, by position in the menu (the menu order is stable)
const PALETTE = [
    '#1677ff',
    '#722ed1',
    '#13c2c2',
    '#fa8c16',
    '#52c41a',
    '#eb2f96',
    '#2f54eb',
    '#faad14',
    '#a0d911',
    '#8c8c8c'
];

const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
`;

const pop = keyframes`
    from { opacity: 0; transform: scale(0.96) translateY(6px); }
    to { opacity: 1; transform: none; }
`;

const reducedMotion = css`
    @media (prefers-reduced-motion: reduce) {
        animation: none;
        transition: none;
    }
`;

const SectionRow = styled.div<{ $color: string; $active: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 12px;
    margin-bottom: 2px;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid ${({ $active, $color }) => ($active ? `${$color}66` : 'transparent')};
    background: ${({ $active, $color }) => ($active ? `${$color}14` : 'transparent')};
    transition:
        background 0.2s ease,
        border-color 0.2s ease,
        transform 0.2s ${EASE};

    &:hover {
        transform: translateX(2px);
        background: ${({ $active, $color }) =>
            $active ? `${$color}1f` : 'rgba(128, 128, 128, 0.08)'};
    }

    &:focus-visible {
        outline: 2px solid ${({ $color }) => $color};
        outline-offset: 2px;
    }

    .home-chevron {
        font-size: 12px;
        color: ${({ $active, $color }) => ($active ? $color : 'rgba(128, 128, 128, 0.6)')};
        transform: ${({ $active }) => ($active ? 'rotate(90deg)' : 'none')};
        transition:
            transform 0.35s ${EASE},
            color 0.2s ease;
    }

    ${reducedMotion}
`;

const DetailCard = styled(Card)<{ $color: string }>`
    border-top: 3px solid ${({ $color }) => $color};
    border-radius: 12px;
    min-height: 200px;
    animation: ${pop} 0.3s ${EASE} both;
    ${reducedMotion}
`;

const EmptyDetail = styled.div`
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px;
    border: 1px dashed rgba(128, 128, 128, 0.35);
    border-radius: 12px;
`;

const ChipRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
`;

// a sub-menu (Cartography, Access management…) is a framed block carrying its name as a legend, so
// nothing that is not clickable ever sits in the middle of a row of chips
const SubGroup = styled.div<{ $color: string }>`
    border: 1px solid ${({ $color }) => `${$color}33`};
    background: ${({ $color }) => `${$color}08`};
    border-radius: 12px;
    padding: 8px 12px 10px;

    .home-subgroup-legend {
        display: block;
        margin-bottom: 8px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        color: ${({ $color }) => $color};
    }
`;

const Chip = styled.span<{ $color: string; $index: number }>`
    display: inline-flex;
    align-items: center;
    border: 1px solid ${({ $color }) => `${$color}55`};
    background: ${({ $color }) => `${$color}0d`};
    border-radius: 16px;
    font-size: 13px;
    line-height: 20px;
    animation: ${fadeUp} 0.32s ${EASE} both;
    animation-delay: ${({ $index }) => $index * 22}ms;
    transition:
        transform 0.15s ease,
        box-shadow 0.15s ease;

    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
    }

    a {
        padding: 4px 6px 4px 12px;
        color: inherit;
    }

    a:hover {
        color: ${({ $color }) => $color};
    }

    .home-chip-star {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px 4px 4px;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 12px;
        line-height: 1;
        color: rgba(128, 128, 128, 0.55);
        transition:
            color 0.15s ease,
            transform 0.15s ease;
    }

    .home-chip-star:hover {
        color: #faad14;
        transform: scale(1.15);
    }

    .home-chip-star.is-active {
        color: #faad14;
    }

    ${reducedMotion}
`;

const PanelRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 7px 8px;
    margin: 0 -8px;
    border-radius: 6px;
    transition: background 0.2s ease;

    &:hover {
        background: rgba(128, 128, 128, 0.08);
    }

    .home-panel-row-main {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        color: inherit;
    }

    .home-panel-row-star {
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 2px 4px;
        color: #faad14;
        line-height: 1;
    }

    ${reducedMotion}
`;

// ----------------------------------------------------------------------------------- sections

type SubGroupEntries = { label: string; entries: SideMenuEntry[] };
type HomeSection = SideMenuSection & {
    color: string;
    /** screens directly under the section */
    direct: SideMenuEntry[];
    /** screens under a sub-menu, one group per sub-menu, in menu order */
    groups: SubGroupEntries[];
};

const toHomeSections = (sections: SideMenuSection[]): HomeSection[] =>
    sections.map((section, index) => {
        const direct: SideMenuEntry[] = [];
        const groups: SubGroupEntries[] = [];
        section.entries.forEach((entry) => {
            const label = entry.section.slice(1).join(' › ');
            if (!label) {
                direct.push(entry);
                return;
            }
            let group = groups.find((g) => g.label === label);
            if (!group) {
                group = { label, entries: [] };
                groups.push(group);
            }
            group.entries.push(entry);
        });
        return { ...section, color: PALETTE[index % PALETTE.length], direct, groups };
    });

// the section opened last is remembered for the tab, so coming back home does not start over
const SELECTED_SECTION_KEY = 'cella-home-section';

const readSelectedSection = (): string | null => {
    try {
        return window.sessionStorage.getItem(SELECTED_SECTION_KEY);
    } catch {
        return null;
    }
};

const writeSelectedSection = (label: string | null): void => {
    try {
        if (label) {
            window.sessionStorage.setItem(SELECTED_SECTION_KEY, label);
        } else {
            window.sessionStorage.removeItem(SELECTED_SECTION_KEY);
        }
    } catch {
        // storage unavailable: the selection just lives in the component
    }
};

// --------------------------------------------------------------------------------- favourites
// Stored per user like the theme or the language: a `warehouseWorkerSetting` row with code
// `homeFavourites` and `valueJson: { hrefs: string[] }`. AppLayout loads every setting of the user
// into AppContext at boot, so reading is synchronous; toggling updates the context first
// (optimistic) and then creates or updates the row.

const HOME_FAVOURITES_CODE = 'homeFavourites';

const CREATE_SETTING = gql`
    mutation ($input: CreateWarehouseWorkerSettingInput!) {
        createWarehouseWorkerSetting(input: $input) {
            id
            code
            valueJson
        }
    }
`;

const UPDATE_SETTING = gql`
    mutation ($id: String!, $input: UpdateWarehouseWorkerSettingInput!) {
        updateWarehouseWorkerSetting(id: $id, input: $input) {
            id
            code
            valueJson
        }
    }
`;

const useHomeFavourites = () => {
    const { userSettings, user } = useAppState();
    const dispatch = useAppDispatch();
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();

    const settings: any[] = Array.isArray(userSettings) ? userSettings : [];
    const setting = settings.find((item: any) => item?.code === HOME_FAVOURITES_CODE);
    const favourites: string[] = Array.isArray(setting?.valueJson?.hrefs)
        ? setting.valueJson.hrefs.filter((href: unknown) => typeof href === 'string')
        : [];

    const isFavourite = useCallback((href: string) => favourites.includes(href), [favourites]);

    const toggleFavourite = useCallback(
        async (href: string) => {
            const next = favourites.includes(href)
                ? favourites.filter((item) => item !== href)
                : [...favourites, href];
            const valueJson = { ...(setting?.valueJson ?? {}), hrefs: next };
            const withValue = (id?: string) =>
                setting
                    ? settings.map((item: any) =>
                          item.code === HOME_FAVOURITES_CODE
                              ? { ...item, id: id ?? item.id, valueJson }
                              : item
                      )
                    : [...settings, { id, code: HOME_FAVOURITES_CODE, valueJson }];

            // optimistic: the star reacts immediately
            dispatch({ type: 'SWITCH_USER_SETTINGS', userSettings: withValue() });
            try {
                if (setting?.id) {
                    await graphqlRequestClient.request(UPDATE_SETTING, {
                        id: setting.id,
                        input: { valueJson }
                    });
                } else {
                    const created: any = await graphqlRequestClient.request(CREATE_SETTING, {
                        input: {
                            code: HOME_FAVOURITES_CODE,
                            warehouseWorkerId: user?.id,
                            valueJson
                        }
                    });
                    dispatch({
                        type: 'SWITCH_USER_SETTINGS',
                        userSettings: withValue(created?.createWarehouseWorkerSetting?.id)
                    });
                }
            } catch (error) {
                console.error('home favourites: could not save', error);
                showError(t('messages:error-update-data'));
                dispatch({ type: 'SWITCH_USER_SETTINGS', userSettings: settings });
            }
        },
        [favourites, setting, settings, dispatch, graphqlRequestClient, user?.id, t]
    );

    return { favourites, isFavourite, toggleFavourite };
};

// ------------------------------------------------------------------------------------- pieces

interface IScreenChipProps {
    entry: SideMenuEntry;
    color: string;
    /** position in its list, drives the staggered appearance */
    index: number;
    isFavourite: boolean;
    onToggleFavourite: (href: string) => void;
    onNavigate: (href: string) => void;
}

/** A screen of the menu as a pill: the label navigates, the star pins it to the favourites. */
const ScreenChip: FC<IScreenChipProps> = ({
    entry,
    color,
    index,
    isFavourite,
    onToggleFavourite,
    onNavigate
}: IScreenChipProps) => {
    const { t } = useTranslation();
    const starLabel = isFavourite ? t('actions:remove-favourite') : t('actions:add-favourite');
    const toggle = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        onToggleFavourite(entry.href);
    };
    return (
        <Chip $color={color} $index={index} data-testid="home-screen-chip">
            <Link href={entry.href} onClick={() => onNavigate(entry.href)}>
                {entry.title}
            </Link>
            <button
                type="button"
                className={`home-chip-star${isFavourite ? ' is-active' : ''}`}
                aria-pressed={isFavourite}
                aria-label={starLabel}
                title={starLabel}
                onClick={toggle}
            >
                {isFavourite ? <StarFilled /> : <StarOutlined />}
            </button>
        </Chip>
    );
};

const SectionHeader: FC<{ section: HomeSection; size: number }> = ({ section, size }) => {
    const { t } = useTranslation();
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar
                size={size}
                style={{ backgroundColor: section.color, flex: '0 0 auto' }}
                icon={section.icon ?? <AppstoreOutlined />}
            />
            <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600, fontSize: size > 34 ? 15 : 14 }}>
                    {section.label}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {t(
                        section.entries.length === 1
                            ? 'common:screens-count-one'
                            : 'common:screens-count',
                        { count: section.entries.length }
                    )}
                </Text>
            </div>
        </div>
    );
};

/** The sections of the side menu, one row each; the selected one is highlighted in its colour. */
const SectionList: FC<{
    sections: HomeSection[];
    selected: string | null;
    onSelect: (label: string | null) => void;
}> = ({ sections, selected, onSelect }) => {
    const toggle = (label: string) => onSelect(selected === label ? null : label);
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>, label: string) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggle(label);
        }
    };
    return (
        <Card size="small" styles={{ body: { padding: 6 } }} data-testid="home-section-list">
            {sections.map((section) => {
                const active = section.label === selected;
                return (
                    <SectionRow
                        key={section.label}
                        $color={section.color}
                        $active={active}
                        role="button"
                        tabIndex={0}
                        aria-expanded={active}
                        onClick={() => toggle(section.label)}
                        onKeyDown={(event) => onKeyDown(event, section.label)}
                    >
                        <SectionHeader section={section} size={34} />
                        <RightOutlined className="home-chevron" />
                    </SectionRow>
                );
            })}
        </Card>
    );
};

/** The screens of the selected section: direct screens first, then each sub-menu in its frame. */
const SectionDetail: FC<{
    section: HomeSection | null;
    isFavourite: (href: string) => boolean;
    onToggleFavourite: (href: string) => void;
    onNavigate: (href: string) => void;
}> = ({ section, isFavourite, onToggleFavourite, onNavigate }) => {
    const { t } = useTranslation();
    if (!section) {
        return (
            <EmptyDetail data-testid="home-section-empty">
                <Text type="secondary">{t('common:pick-a-section')}</Text>
            </EmptyDetail>
        );
    }
    let index = 0;
    const chip = (entry: SideMenuEntry) => (
        <ScreenChip
            key={entry.key}
            entry={entry}
            color={section.color}
            index={index++}
            isFavourite={isFavourite(entry.href)}
            onToggleFavourite={onToggleFavourite}
            onNavigate={onNavigate}
        />
    );
    return (
        <DetailCard
            key={section.label}
            $color={section.color}
            size="small"
            styles={{ body: { padding: '16px 18px' } }}
            data-testid="home-section-detail"
        >
            <div style={{ marginBottom: 14 }}>
                <SectionHeader section={section} size={40} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {section.direct.length > 0 && <ChipRow>{section.direct.map(chip)}</ChipRow>}
                {section.groups.map((group) => (
                    <SubGroup key={group.label} $color={section.color} data-testid="home-subgroup">
                        <span className="home-subgroup-legend">{group.label}</span>
                        <ChipRow>{group.entries.map(chip)}</ChipRow>
                    </SubGroup>
                ))}
            </div>
        </DetailCard>
    );
};

/** "Recently visited" (pages recorded by the breadcrumb) and "Favourites" (pinned screens). */
const SidePanel: FC<{
    sections: HomeSection[];
    favourites: string[];
    onToggleFavourite: (href: string) => void;
    onNavigate: (href: string) => void;
}> = ({ sections, favourites, onToggleFavourite, onNavigate }) => {
    const { t } = useTranslation();
    const recent = useRecentPages();
    const label = (value: string) => (isNumeric(value) ? value : t(value));

    // a pinned screen the user may no longer open (permission removed) is simply not listed
    const pinned = favourites.flatMap((href) => {
        const section = sections.find((s) => s.entries.some((e) => e.href === href));
        const entry = section?.entries.find((e) => e.href === href);
        return section && entry ? [{ section, entry }] : [];
    });

    return (
        <>
            <Card
                size="small"
                style={{ marginBottom: 12 }}
                data-testid="home-recent"
                title={
                    <Space>
                        <HistoryOutlined />
                        {t('common:recently-visited')}
                    </Space>
                }
            >
                {recent.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('common:recently-visited-empty')}
                    </Text>
                ) : (
                    recent.map((page) => (
                        <PanelRow key={page.href}>
                            <Link
                                href={page.href}
                                className="home-panel-row-main"
                                onClick={() => onNavigate(page.href)}
                            >
                                <HistoryOutlined style={{ color: 'rgba(128, 128, 128, 0.5)' }} />
                                <span style={{ lineHeight: 1.2 }}>
                                    <span style={{ display: 'block', fontSize: 13 }}>
                                        {label(page.label)}
                                    </span>
                                    {page.meta && (
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            {label(page.meta)}
                                        </Text>
                                    )}
                                </span>
                            </Link>
                            <RightOutlined
                                style={{ color: 'rgba(128, 128, 128, 0.35)', fontSize: 11 }}
                            />
                        </PanelRow>
                    ))
                )}
            </Card>
            <Card
                size="small"
                data-testid="home-favourites"
                title={
                    <Space>
                        <StarOutlined />
                        {t('common:favourites')}
                    </Space>
                }
            >
                {pinned.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('common:favourites-empty')}
                    </Text>
                ) : (
                    pinned.map(({ section, entry }) => (
                        <PanelRow key={entry.href}>
                            <Link
                                href={entry.href}
                                className="home-panel-row-main"
                                onClick={() => onNavigate(entry.href)}
                            >
                                <StarFilled style={{ color: '#faad14' }} />
                                <span style={{ lineHeight: 1.2 }}>
                                    <span style={{ display: 'block', fontSize: 13 }}>
                                        {entry.title}
                                    </span>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {entry.section.join(' › ') || section.label}
                                    </Text>
                                </span>
                            </Link>
                            <button
                                type="button"
                                className="home-panel-row-star"
                                aria-label={t('actions:remove-favourite')}
                                title={t('actions:remove-favourite')}
                                onClick={() => onToggleFavourite(entry.href)}
                            >
                                <StarFilled />
                            </button>
                        </PanelRow>
                    ))
                )}
            </Card>
        </>
    );
};

// --------------------------------------------------------------------------------------- page

const HomePage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const menuSections = useSideMenuSections();
    const sections = useMemo(() => toHomeSections(menuSections), [menuSections]);
    const { favourites, isFavourite, toggleFavourite } = useHomeFavourites();
    const [selected, setSelected] = useState<string | null>(null);

    useEffect(() => {
        const remembered = readSelectedSection();
        if (remembered && sections.some((section) => section.label === remembered)) {
            setSelected(remembered);
        }
    }, [sections.length]);

    const select = (label: string | null) => {
        setSelected(label);
        writeSelectedSection(label);
    };

    // like a click in the side menu: the destination starts a fresh breadcrumb trail
    const navigate = (href: string) =>
        resetBreadcrumbTrailOnNavigation(href, router.asPath, router.locales);

    const current = sections.find((section) => section.label === selected) ?? null;

    return (
        <>
            <AppHead title={t('common:cella')} />
            <div style={{ padding: '20px 28px 40px' }} data-testid="home-navigation">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                    <img alt="logo" src="/cella-logo.png" width={60} />
                    <Title level={4} style={{ margin: 0 }}>
                        {t('common:cella')}
                    </Title>
                </div>
                <Row gutter={[20, 20]}>
                    <Col xs={24} xl={17}>
                        <div style={{ marginBottom: 14 }}>
                            <SideMenuAutoComplete
                                persistent
                                size="large"
                                style={{ width: '100%' }}
                                placeholder={t('common:search-screen-placeholder')}
                            />
                        </div>
                        <Row gutter={[14, 14]}>
                            <Col xs={24} md={9}>
                                <SectionList
                                    sections={sections}
                                    selected={selected}
                                    onSelect={select}
                                />
                            </Col>
                            <Col xs={24} md={15}>
                                <SectionDetail
                                    section={current}
                                    isFavourite={isFavourite}
                                    onToggleFavourite={toggleFavourite}
                                    onNavigate={navigate}
                                />
                            </Col>
                        </Row>
                    </Col>
                    <Col xs={24} xl={7}>
                        <SidePanel
                            sections={sections}
                            favourites={favourites}
                            onToggleFavourite={toggleFavourite}
                            onNavigate={navigate}
                        />
                    </Col>
                </Row>
            </div>
        </>
    );
};

HomePage.layout = MainLayout;

export default HomePage;
