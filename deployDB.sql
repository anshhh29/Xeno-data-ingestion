-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: localhost    Database: trendzy_db
-- ------------------------------------------------------
-- Server version	8.0.40

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `firstName` varchar(255) DEFAULT NULL,
  `lastName` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `totalSpent` decimal(14,2) DEFAULT NULL,
  `ordersCount` int DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `createdAtShopify` datetime DEFAULT NULL,
  `updatedAtShopify` datetime DEFAULT NULL,
  `shopifyId` bigint DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_customer_per_tenant` (`shopifyId`,`tenantId`),
  KEY `tenantId` (`tenantId`),
  CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1135 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1078,21,NULL,NULL,NULL,433.82,1,NULL,'2025-09-13 05:33:37','2025-09-13 05:34:33',9666480472379,NULL),(1079,21,NULL,NULL,NULL,1088.91,1,NULL,'2025-09-12 18:31:58','2025-09-12 18:32:59',9665750892859,NULL),(1080,21,NULL,NULL,NULL,588.82,2,NULL,'2025-09-08 17:17:44','2025-09-12 18:16:28',9659262533947,NULL);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orderproducts`
--

DROP TABLE IF EXISTS `orderproducts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orderproducts` (
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `OrderId` int unsigned NOT NULL,
  `ProductId` int unsigned NOT NULL,
  PRIMARY KEY (`OrderId`,`ProductId`),
  KEY `ProductId` (`ProductId`),
  CONSTRAINT `orderproducts_ibfk_1` FOREIGN KEY (`OrderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `orderproducts_ibfk_2` FOREIGN KEY (`ProductId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orderproducts`
--

LOCK TABLES `orderproducts` WRITE;
/*!40000 ALTER TABLE `orderproducts` DISABLE KEYS */;
/*!40000 ALTER TABLE `orderproducts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `customerId` int unsigned DEFAULT NULL,
  `totalPrice` decimal(14,2) DEFAULT NULL,
  `shopifyId` bigint DEFAULT NULL,
  `orderNumber` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_order_per_tenant` (`shopifyId`,`tenantId`),
  KEY `tenantId` (`tenantId`),
  KEY `fk_orders_customer` (`customerId`),
  CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1578 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1258,21,1078,433.82,6858697244987,'1008','paid','2025-09-13 05:34:33'),(1259,21,1079,1088.91,6857885548859,'1007','paid','2025-09-12 18:32:59'),(1260,21,1080,588.82,6857859727675,'1006','paid','2025-09-12 18:16:27'),(1261,21,NULL,942.82,6857357689147,'1005','paid','2025-09-12 11:22:39'),(1262,21,NULL,234.82,6855746257211,'1004','refunded','2025-09-11 06:11:23'),(1263,21,1080,999.00,6854830326075,'1003','refunded','2025-09-10 15:03:26'),(1264,21,NULL,5888.20,6854543049019,'1002','refunded','2025-09-10 08:54:21'),(1265,21,NULL,1177.64,6854399295803,'1001','refunded','2025-09-10 05:04:21');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenantId` int NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `price` decimal(12,2) DEFAULT NULL,
  `sku` varchar(255) DEFAULT NULL,
  `shopifyId` bigint DEFAULT NULL,
  `handle` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_per_tenant` (`shopifyId`,`tenantId`),
  KEY `tenantId` (`tenantId`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1542 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1417,21,'Black Hoodie',999.00,'BH-002',10171371323707,'black-hoodie'),(1418,21,'Blue T-Shirt',499.00,'BT-001',10171371290939,'blue-t-shirt'),(1419,21,'Green Mug',199.00,'GM-003',10171371356475,'green-mug'),(1420,21,'Short Sleeve T-Shirt',799.00,NULL,10171356283195,'short-sleeve-t-shirt');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenants`
--

DROP TABLE IF EXISTS `tenants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `shopDomain` varchar(255) NOT NULL,
  `shopAccessToken` text NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shopDomain` (`shopDomain`)
) ENGINE=InnoDB AUTO_INCREMENT=410 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenants`
--

LOCK TABLES `tenants` WRITE;
/*!40000 ALTER TABLE `tenants` DISABLE KEYS */;
INSERT INTO `tenants` VALUES (21,'Demo Tenant','https://trenddzyy.myshopify.com/','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','2025-09-10 15:32:30','2025-09-10 15:32:30'),(22,'Ansh Popli','https://rcr1d9-vq.myshopify.com','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','2025-09-10 15:51:32','2025-09-10 15:51:32');
/*!40000 ALTER TABLE `tenants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `passwordHash` varchar(255) DEFAULT NULL,
  `tenantId` int DEFAULT NULL,
  `role` enum('admin','viewer') DEFAULT 'viewer',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `tenantId` (`tenantId`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (3,'anshpopli29@gmail.com','$2b$10$B/75gSfVpc9gmGx7FNsJHuxGI33ltf7c793Fy0/MNhySwa9Iw1V5O',22,'admin','2025-09-10 15:51:32','2025-09-10 15:51:32');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-13 23:22:26
