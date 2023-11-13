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

const FrPage: PageComponent = () => {
    const { Title, Paragraph } = Typography;
    return (
        <>
            <Space direction="vertical" size="large">
                <Row align="middle" className="welcomeLogo" justify="center">
                    <img alt="logo" src="/cella-logo.png" width={'200'} />
                </Row>
                <Row align="middle" justify="center">
                    <Title level={3}>À propos de CELLA</Title>
                </Row>
                <Row align="middle" justify="center">
                    <Title level={4}>Donnez de la Puissance à la Gestion de Votre Entrepôt</Title>
                </Row>
                <Row align="middle" justify="center">
                    <Paragraph style={{ maxWidth: '80%', padding: '0 10%', textAlign: 'center' }}>
                        Bienvenue sur CELLA, le système de gestion d&apos;entrepôt (WMS) de nouvelle
                        génération développé par KLOCEL.
                        <br />
                        Chez KLOCEL, nous nous engageons à révolutionner la manière dont vous gérez
                        vos opérations d&apos;entrepôt, et CELLA est la concrétisation de cet
                        engagement.
                    </Paragraph>
                </Row>
                <Row align="middle" justify="center">
                    <Title level={4}>Notre Histoire</Title>
                </Row>
                <Row align="middle" justify="center">
                    <Paragraph style={{ maxWidth: '80%', padding: '0 10%', textAlign: 'center' }}>
                        KLOCEL est en première ligne des solutions basées sur la technologie pour la
                        gestion d&apos;entrepôt depuis notre création. Avec une passion pour
                        l&apos;innovation et une compréhension approfondie de l&apos;industrie de la
                        logistique, nous avons entrepris de créer un WMS qui non seulement
                        rationalise vos opérations d&apos;entrepôt, mais qui s&apos;adapte également
                        aux exigences toujours changeantes des chaînes d&apos;approvisionnement
                        modernes.
                    </Paragraph>
                </Row>
                <Row align="middle" justify="center">
                    <Title level={4}>Pourquoi CELLA ?</Title>
                </Row>
                <Row align="middle" justify="center">
                    <Paragraph style={{ maxWidth: '80%', padding: '0 10%', textAlign: 'center' }}>
                        CELLA n&apos;est pas simplement un WMS ; c&apos;est votre partenaire
                        stratégique pour atteindre l&apos;excellence opérationnelle. Notre système
                        est conçu pour répondre aux défis auxquels sont confrontés les entrepôts
                        aujourd&apos;hui, offrant une gamme étendue de fonctionnalités qui nous
                        distinguent :
                        <Paragraph style={{ marginTop: '1%', padding: '0 5%' }}>
                            <Text strong>1. Gestion d&apos;Inventaire en Temps Réel : </Text>
                            CELLA offre une vue en temps réel de votre inventaire, vous permettant
                            de prendre des décisions éclairées, de réduire les ruptures de stock et
                            d&apos;optimiser l&apos;espace de stockage.
                        </Paragraph>
                        <Paragraph style={{ marginTop: '1%', padding: '0 5%' }}>
                            <Text strong>2. Efficacité de l&apos;Exécution des Commandes : </Text>
                            Nous rationalisons la préparation, l&apos;emballage et l&apos;expédition
                            des commandes, en veillant à ce que vos commandes soient traitées avec
                            précision et dans les délais, à chaque fois.
                        </Paragraph>
                        <Paragraph style={{ marginTop: '1%', padding: '0 5%' }}>
                            <Text strong>3. Analyse Avancée : </Text>
                            Exploitez la puissance des données grâce à nos robustes outils
                            d&apos;analyse, qui fournissent des informations sur les performances de
                            l&apos;entrepôt, vous aidant à prendre des décisions basées sur les
                            données.
                        </Paragraph>
                        <Paragraph style={{ marginTop: '1%', padding: '0 5%' }}>
                            <Text strong>4. Prise en Charge Multi-Canal : </Text>
                            Que vous opériez dans le commerce électronique, la vente au détail ou la
                            distribution, CELLA s&apos;adapte à vos besoins commerciaux uniques.
                        </Paragraph>
                        <Paragraph style={{ marginTop: '1%', padding: '0 5%' }}>
                            <Text strong>5. Accessibilité Mobile : </Text>
                            Restez aux commandes où que vous soyez grâce à notre interface
                            conviviale pour les appareils mobiles, vous permettant de gérer votre
                            entrepôt en déplacement.
                        </Paragraph>
                        <Paragraph style={{ marginTop: '1%', padding: '0 5%' }}>
                            <Text strong>6. Scalabilité : </Text>À mesure que votre entreprise se
                            développe, CELLA évolue avec vous. Notre architecture évolutive garantit
                            que votre WMS peut gérer toute augmentation de la demande.
                        </Paragraph>
                        <Paragraph style={{ marginTop: '1%', padding: '0 5%' }}>
                            <Text strong>7. Capacités d&apos;Intégration : </Text>
                            Intégrez facilement CELLA avec vos systèmes existants, y compris les
                            ERP, les systèmes de point de vente et les plateformes de commerce
                            électronique.
                        </Paragraph>
                        <Paragraph style={{ marginTop: '1%', padding: '0 5%' }}>
                            <Text strong>8. Interface Conviviale : </Text>
                            L&apos;interface intuitive de CELLA réduit le temps de formation de
                            votre personnel, vous permettant de former rapidement votre équipe.
                        </Paragraph>
                    </Paragraph>
                </Row>
                <Row align="middle" justify="center">
                    <Title level={4}>Notre Engagement</Title>
                </Row>
                <Row align="middle" justify="center">
                    <Paragraph style={{ maxWidth: '80%', padding: '0 10%', textAlign: 'center' }}>
                        Chez KLOCEL, nous nous engageons à votre réussite. Nous comprenons que votre
                        entrepôt est le cœur de votre entreprise, et nous sommes là pour garantir
                        son fonctionnement à une efficacité maximale. Avec CELLA, vous ne gagnez pas
                        seulement un WMS, mais un partenaire qui soutient votre croissance,
                        rationalise vos processus et améliore la satisfaction de vos clients.
                        <br />
                        <br />
                        Rejoignez les innombrables entreprises qui ont déjà adopté l&apos;avenir de
                        la gestion d&apos;entrepôt avec CELLA. Laissez-nous vous aider à transformer
                        votre entrepôt en une machine bien huilée, prête à relever les défis du
                        marché dynamique d&apos;aujourd&apos;hui.
                    </Paragraph>
                </Row>
                <Row align="middle" justify="center">
                    <Title level={4}>Contactez-Nous</Title>
                </Row>
                <Row align="middle" justify="center">
                    <Paragraph style={{ maxWidth: '80%', padding: '0 10%', textAlign: 'center' }}>
                        Prêt à franchir la prochaine étape ? Contactez notre équipe à{' '}
                        <a href="mailto:solutions@klocel.com">solutions@klocel.com</a> pour
                        planifier une démonstration et découvrir comment CELLA peut révolutionner
                        votre gestion d&apos;entrepôt.
                        <br />
                        <br />
                        Merci de considérer KLOCEL et CELLA comme vos partenaires de confiance en
                        matière de gestion d&apos;entrepôt. Nous sommes impatients de vous aider à
                        réussir !
                    </Paragraph>
                </Row>
            </Space>
        </>
    );
};

FrPage.layout = MainLayout;

export default FrPage;
