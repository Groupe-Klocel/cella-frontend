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

import { RadioInfosHeader } from '@components';
import { Carousel } from 'antd';
import { FC, ReactNode } from 'react';
import styled from 'styled-components';

const CarouselWrapper = styled(Carousel)`
    padding: 0 16px 14px;
    min-height: 100px;
    min-width: 220px;
    .slick-dots-bottom {
        bottom: 0px !important;
    }
    .slick-dots li button {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: linear-gradient(to bottom, #f4a261 5%, #f5c73d 100%) !important;
    }
    /* antd >=5.17 draws the arrow chevron itself (::after, currentcolor): keep the native
       buttons (no custom icon, it would duplicate the chevron) and restyle them, as the white
       image-slider default is invisible on the header background. NB antd puts the incoming
       className on .slick-slider (not .ant-carousel), so this padding is the slider's own
       gutter: left/right 0 keeps the 16px-wide arrows inside it, off the slide content. */
    .slick-prev,
    .slick-next {
        color: #000000 !important;
        opacity: 1 !important;
        z-index: 2;
        background: radial-gradient(circle, #f5c73d 70%, #f4a261 100%) !important;
        border: 1px solid #f4a261 !important;
        border-radius: 50% !important;
    }
    .slick-prev:hover,
    .slick-next:hover {
        background: #f4a261 !important;
    }
    /* with infinite=false antd fully hides the disabled end arrow: keep it faintly visible */
    .slick-prev.slick-disabled,
    .slick-next.slick-disabled {
        opacity: 0.25 !important;
    }
    /* center the chevron in the circle: the glyph is a rotated square with only two borders
       drawn, so it fills half of its own box — hence the asymmetric horizontal translate */
    .slick-prev::after,
    .slick-next::after {
        top: 50% !important;
        inset-inline-start: 50% !important;
    }
    .slick-prev::after {
        transform: translate(-25%, -50%) rotate(-45deg) !important;
    }
    .slick-next::after {
        transform: translate(-75%, -50%) rotate(135deg) !important;
    }
    .slick-prev {
        left: 0px !important;
    }
    .slick-next {
        right: 0px !important;
    }
`;

// Declarative extra header slide (mirrors the buttonManagement pattern): each slide says on
// which steps it shows and what it displays; the process page owns the conditions and content.
export interface RadioHeaderSlideType {
    key: string;
    content: ReactNode;
    // steps the slide is visible on; omitted = visible on every step
    visibleOnSteps?: number[];
    // extra data-driven condition on top of the step filter; omitted = true
    visible?: boolean;
}

export interface IRadioHeadersCarouselProps {
    // infos of the standard header (always the first slide when present)
    headerDisplay: { [label: string]: any };
    // current step of the process, matched against each slide's visibleOnSteps
    currentStep?: number;
    slides?: RadioHeaderSlideType[];
    // key of the slide to show when the carousel (re)mounts: pass the value received through
    // onActiveSlideChange to keep the operator on their chosen header across step changes
    // (the carousel unmounts whenever no extra slide is visible). The standard infos header
    // is addressed by the 'radio-infos-header' key; an unknown key falls back to it.
    activeSlideKey?: string;
    // called with the slide's key when the operator swipes/arrows to another slide
    onActiveSlideChange?: (key: string) => void;
}

// key of the standard infos header slide, for activeSlideKey/onActiveSlideChange
export const INFOS_HEADER_SLIDE_KEY = 'radio-infos-header';

// Header zone with optional extra headers: renders the standard RadioInfosHeader alone as long
// as no extra slide is visible, and switches to a swipe/arrows carousel (one slide per header)
// as soon as at least one is.
const RadioHeadersCarousel: FC<IRadioHeadersCarouselProps> = ({
    headerDisplay,
    currentStep,
    slides,
    activeSlideKey,
    onActiveSlideChange
}: IRadioHeadersCarouselProps) => {
    const visibleSlides = (slides ?? []).filter(
        (slide) =>
            slide.visible !== false &&
            (!slide.visibleOnSteps ||
                (currentStep !== undefined && slide.visibleOnSteps.includes(currentStep)))
    );
    const hasInfos = Object.keys(headerDisplay ?? {}).length !== 0;

    if (!hasInfos && visibleSlides.length === 0) {
        return <></>;
    }

    if (visibleSlides.length === 0) {
        return (
            <RadioInfosHeader
                input={{
                    displayed: headerDisplay
                }}
            ></RadioInfosHeader>
        );
    }

    // react-slick counts every child as a slide (an empty fragment included): build the list
    const slideNodes = [
        ...(hasInfos
            ? [
                  <div key={INFOS_HEADER_SLIDE_KEY}>
                      <RadioInfosHeader
                          input={{
                              displayed: headerDisplay
                          }}
                      ></RadioInfosHeader>
                  </div>
              ]
            : []),
        ...visibleSlides.map((slide) => <div key={slide.key}>{slide.content}</div>)
    ];

    // initialSlide only applies on mount, which is exactly when it matters: the carousel
    // remounts each time it comes back after a plain-header phase (no visible extra slide)
    const slideKeys = slideNodes.map((node) => node.key as string);
    const initialSlide = activeSlideKey ? Math.max(0, slideKeys.indexOf(activeSlideKey)) : 0;

    return (
        <CarouselWrapper
            arrows
            infinite={false}
            swipeToSlide
            adaptiveHeight
            initialSlide={initialSlide}
            // beforeChange, not afterChange: the latter never fires with antd's
            // waitForAnimate=false default (react-slick quirk)
            beforeChange={(_: number, next: number) => {
                if (slideKeys[next]) {
                    onActiveSlideChange?.(slideKeys[next]);
                }
            }}
        >
            {slideNodes}
        </CarouselWrapper>
    );
};

RadioHeadersCarousel.displayName = 'RadioHeadersCarousel';

export { RadioHeadersCarousel };
