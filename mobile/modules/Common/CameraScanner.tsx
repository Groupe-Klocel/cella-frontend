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
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { NavButton } from '@components';
import { CameraOutlined, CloseOutlined, SyncOutlined, UndoOutlined } from '@ant-design/icons';
import { Col, Row, Space } from 'antd';

const BarcodeScannerComponent = dynamic(() => import('react-qr-barcode-scanner'), { ssr: false });

export interface ICameraScannerProps {
    camData: { [label: string]: any };
    handleCleanData: () => void;
}

function CameraScanner({ camData: { setCamData }, handleCleanData }: ICameraScannerProps) {
    // const [data, setData] = useState('Not Found');
    const [stopStream, setStopStream] = useState(true);
    const [environmentCam, setEnvironmentCam] = useState(true);

    const handleCameraToggle = () => {
        setStopStream(!stopStream);
    };

    const handleSwitchCamera = () => {
        setEnvironmentCam(!environmentCam);
    };

    return (
        <>
            <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                <Col>
                    <Space>
                        <NavButton
                            icon={stopStream ? <CameraOutlined /> : <CloseOutlined />}
                            onClick={handleCameraToggle}
                        ></NavButton>
                        <NavButton icon={<SyncOutlined />} onClick={handleSwitchCamera}></NavButton>
                        <NavButton icon={<UndoOutlined />} onClick={handleCleanData}></NavButton>
                    </Space>
                </Col>
            </Row>
            <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                <Col span={24}>
                    {stopStream ? (
                        <></>
                    ) : (
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                            <BarcodeScannerComponent
                                width={200}
                                height={200}
                                onUpdate={(err, result) => {
                                    if (result) setCamData(result.getText());
                                }}
                                facingMode={environmentCam ? 'environment' : 'user'}
                            />
                        </div>
                    )}
                </Col>
            </Row>
        </>
    );
}

export default CameraScanner;
