<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

use App\Services\Vnnox\VnnoxPlaylogService;
use App\Models\VnnoxPlaylogLog;

class SyncDailyVnnoxPlaylogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'vnnox:sync-daily {--date= : Specific date to sync (YYYY-MM-DD), defaults to today} {--check-logs : Probe and print all active logs from VNNOX API}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Archive VNNOX NovaStar playlog records from both Truck 1 and Truck 2 into local database';

    /**
     * Execute the console command.
     */
    public function handle(VnnoxPlaylogService $playlogService): int
    {
        $targetDate = $this->option('date') ?? date('Y-m-d');
        $this->info("Archiving VNNOX Playlog Records for date: {$targetDate}...");

        $trucks = ['truck_1', 'truck_2'];

        foreach ($trucks as $truckId) {
            $truckName = $truckId === 'truck_2' ? 'Truk LED 02 (B 9729 JXS)' : 'Truk LED 01 (B 9731 JXS)';
            $this->output->write(" -> Syncing Playlogs for {$truckName}... ");

            try {
                $result = $playlogService->getPlaylogRecordsData(true, $truckId);
                $records = $result['records'] ?? [];
                $savedCount = 0;

                foreach ($records as $record) {
                    VnnoxPlaylogLog::recordLog($truckId, $targetDate, $record);
                    $savedCount++;
                }

                $this->info("SUCCESS: {$savedCount} playlog items archived.");
            } catch (\Throwable $e) {
                $this->error("FAILED: " . $e->getMessage());
            }
        }

        $this->info("VNNOX Playlog archiving completed successfully!");
        return Command::SUCCESS;
    }
}

