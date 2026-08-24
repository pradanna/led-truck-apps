<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class FoxloggerMqttListenCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'gps:listen-wss';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Listen to Foxlogger real-time telemetry stream via MQTT WSS (wss://mqtt.foxlogger.app/mqtt) and save directly into database';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info("Starting Foxlogger MQTT WSS Telemetry Listener...");
        $scriptPath = base_path('bin/foxlogger-mqtt-listener.js');

        if (!file_exists($scriptPath)) {
            $this->error("Worker script not found at {$scriptPath}");
            return Command::FAILURE;
        }

        $process = new Process(['node', $scriptPath], base_path(), [
            'DB_HOST' => config('database.connections.mysql.host', '127.0.0.1'),
            'DB_PORT' => config('database.connections.mysql.port', '3306'),
            'DB_DATABASE' => config('database.connections.mysql.database', 'led_truck_apps'),
            'DB_USERNAME' => config('database.connections.mysql.username', 'root'),
            'DB_PASSWORD' => config('database.connections.mysql.password', ''),
        ]);

        $process->setTimeout(null);

        $process->run(function ($type, $buffer) {
            $this->output->write($buffer);
        });

        return Command::SUCCESS;
    }
}
