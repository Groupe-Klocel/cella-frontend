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
import { Row, Space, Typography } from 'antd';
import Text from 'antd/lib/typography/Text';
import MainLayout from 'components/layouts/MainLayout';
import { FC } from 'react';

type PageComponent = FC & { layout: typeof MainLayout };

const EnPage: PageComponent = () => {
    const { Title, Paragraph } = Typography;
    return (
        <>
            <Space direction="vertical" size="large">
                <Row align="middle" className="welcomeLogo" justify="center">
                    <img alt="logo" src="/cella-logo.png" width={'200'} />
                </Row>
                <Row align="middle" justify="center">
                    <Title level={3}>About CELLA</Title>
                </Row>
                <Row align="middle" justify="center">
                    <Title level={4}>Empowering Your Warehouse Management</Title>
                </Row>
                <Row align="middle" justify="center">
                    <Paragraph style={{ maxWidth: '80%', padding: '0 10%', textAlign: 'center' }}>
                        Welcome to CELLA, the next generation Warehouse Management System (WMS)
                        brought to you by KLOCEL.
                        <br />
                        At KLOCEL, we are committed to revolutionizing the way you manage your
                        warehouse operations, and CELLA is the embodiment of that commitment.
                    </Paragraph>
                </Row>
                <Row align="middle" justify="center">
                    <Title level={4}>Our Story</Title>
                </Row>
                <Row align="middle" justify="center">
                    <Paragraph style={{ maxWidth: '80%', padding: '0 10%', textAlign: 'center' }}>
                        KLOCEL has been at the forefront of technology-driven solutions for
                        warehouse management since our inception. With a passion for innovation and
                        a deep understanding of the logistics industry, we set out to create a WMS
                        that not only streamlines your warehouse operations but also adapts to the
                        ever-evolving demands of modern supply chains.
                    </Paragraph>
                </Row>
                <Row align="middle" justify="center">
                    <Title level={4}>Why CELLA?</Title>
                </Row>
                <Row align="middle" justify="center">
                    <Paragraph style={{ maxWidth: '80%', padding: '0 10%', textAlign: 'center' }}>
                        CELLA isn&apos;t just a WMS; it&apos;s your strategic partner in achieving
                        operational excellence. Our system is designed to address the challenges
                        faced by warehouses today, offering a wide array of features that set us
                        apart:
                        <Paragraph style={{ marginTop: '1%', padding: '0 5%' }}>
                            <Text strong>1. Real-time Inventory Management: </Text>
                            CCELLA provides a real-time view of your inventory, enabling you to make
                            informed decisions, reduce stockouts, and optimize storage space.
                        </Paragraph>
                        <Paragraph style={{ marginTop: '1%', padding: '0 5%' }}>
                            <Text strong>2. Order Fulfillment Efficiency: </Text>
                            We streamline order picking, packing, and shipping, making sure your
                            orders are processed accurately and on time, every time.
                        </Paragraph>
                        <Paragraph style={{ marginTop: '1%', padding: '0 5%' }}>
                            <Text strong>3. Advanced Analytics: </Text>
                            Harness the power of data with our robust analytics tools, which provide
                            insights into warehouse performance, helping you make data-driven
                            decisions.
                        </Paragraph>
                        <Paragraph style={{ marginTop: '1%', padding: '0 5%' }}>
                            <Text strong>4. Multi-Channel Support: </Text>
                            Whether you operate in e-commerce, retail, or distribution, CELLA is
                            adaptable to your unique business needs.
                        </Paragraph>
                        <Paragraph style={{ marginTop: '1%', padding: '0 5%' }}>
                            <Text strong>5. Mobile Accessibility: </Text>
                            Stay in control no matter where you are with our mobile-friendly
                            interface, allowing you to manage your warehouse on the go.
                        </Paragraph>
                        <Paragraph style={{ marginTop: '1%', padding: '0 5%' }}>
                            <Text strong>6. Scalability: </Text>As your business grows, CELLA grows
                            with you. Our scalable architecture ensures that your WMS can handle any
                            increase in demand.
                        </Paragraph>
                        <Paragraph style={{ marginTop: '1%', padding: '0 5%' }}>
                            <Text strong>7. Integration Capabilities: </Text>
                            Seamlessly integrate CELLA with your existing systems, including ERPs,
                            POS, and e-commerce platforms.
                        </Paragraph>
                        <Paragraph style={{ marginTop: '1%', padding: '0 5%' }}>
                            <Text strong>8. User-Friendly Interface: </Text>
                            CELLA&apos;s intuitive interface reduces training time for your staff,
                            getting your team up to speed quickly.
                        </Paragraph>
                    </Paragraph>
                </Row>
                <Row align="middle" justify="center">
                    <Title level={4}>Our Commitment</Title>
                </Row>
                <Row align="middle" justify="center">
                    <Paragraph style={{ maxWidth: '80%', padding: '0 10%', textAlign: 'center' }}>
                        At KLOCEL, we are committed to your success. We understand that your
                        warehouse is the heart of your business, and we are here to ensure it
                        operates at peak efficiency. With CELLA, you not only gain a WMS but a
                        partner that supports your growth, streamlines your processes, and enhances
                        your customer satisfaction.
                        <br />
                        <br />
                        Join the countless businesses that have already embraced the future of
                        warehouse management with CELLA. Let us help you transform your warehouse
                        into a well-oiled machine, ready to meet the challenges of today&apos;s
                        dynamic market.
                    </Paragraph>
                </Row>
                <Row align="middle" justify="center">
                    <Title level={4}>Contact Us</Title>
                </Row>
                <Row align="middle" justify="center">
                    <Paragraph style={{ maxWidth: '80%', padding: '0 10%', textAlign: 'center' }}>
                        Ready to take the next step? Contact our team at{' '}
                        <a href="mailto:solutions@klocel.com">solutions@klocel.com</a> to schedule a
                        demo and discover how CELLA can revolutionize your warehouse management.
                        <br />
                        <br />
                        Thank you for considering KLOCEL and CELLA as your trusted partners in
                        warehouse management. We look forward to helping you succeed!
                    </Paragraph>
                </Row>
            </Space>
        </>
    );
};

EnPage.layout = MainLayout;

export default EnPage;
