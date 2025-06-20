<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// Carregar clientes de um arquivo JSON (se existir)
$clientsFile = 'clients.json';
$clients = [];
if (file_exists($clientsFile)) {
    $clients = json_decode(file_get_contents($clientsFile), true) ?: [];
}

$request_method = $_SERVER['REQUEST_METHOD'];
$request_uri = $_SERVER['REQUEST_URI'];

switch ($request_method) {
    case 'GET':
        if (preg_match('/\/clients$/', $request_uri)) {
            echo json_encode($clients);
        } elseif (preg_match('/\/clients\/(\d+)$/', $request_uri, $matches)) {
            $clientId = (int)$matches[1];
            $client = array_filter($clients, fn($c) => $c['id'] === $clientId);
            $client = array_values($client);
            if (empty($client)) {
                http_response_code(404);
                echo json_encode(["error" => "Cliente não encontrado"]);
            } else {
                echo json_encode($client[0]);
            }
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Endpoint não encontrado"]);
        }
        break;

    case 'POST':
        if (preg_match('/\/client$/', $request_uri)) {
            $name = $_POST['name'] ?? '';
            $cpf = $_POST['cpf'] ?? '';
            $address = $_POST['address'] ?? '';
            $deliveryDate = $_POST['deliveryDate'] ?? '';
            $paymentMethod = $_POST['paymentMethod'] ?? '';
            $total = $_POST['total'] ?? '';
            $productName = $_POST['productName'] ?? '';
            $pixCode = $_POST['pixCode'] ?? '';

            $productPhoto = '';
            if (isset($_FILES['productPhoto']) && $_FILES['productPhoto']['error'] === UPLOAD_ERR_OK) {
                $productPhoto = base64_encode(file_get_contents($_FILES['productPhoto']['tmp_name']));
            }
            $qrCode = '';
            if (isset($_FILES['qrCode']) && $_FILES['qrCode']['error'] === UPLOAD_ERR_OK) {
                $qrCode = base64_encode(file_get_contents($_FILES['qrCode']['tmp_name']));
            }

            if (!$name || !$cpf) {
                http_response_code(400);
                echo json_encode(["error" => "Nome e CPF são obrigatórios"]);
                exit;
            }

            $new_client = [
                "id" => count($clients) + 1,
                "name" => $name,
                "cpf" => $cpf,
                "address" => $address,
                "deliveryDate" => $deliveryDate,
                "paymentMethod" => $paymentMethod,
                "total" => $total,
                "productName" => $productName,
                "productPhoto" => $productPhoto,
                "qrCode" => $qrCode,
                "pixCode" => $pixCode
            ];
            $clients[] = $new_client;

            // Salvar a lista atualizada no arquivo JSON
            file_put_contents($clientsFile, json_encode($clients));

            $response = [
                "success" => true,
                "client" => $new_client,
                "link" => "/index.html?id={$new_client['id']}"
            ];
            echo json_encode($response);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Endpoint não encontrado"]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Método não permitido"]);
        break;
}
?>