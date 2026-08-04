<script lang="ts">
	import type { You } from '$lib';
	import { SenderError } from 'spacetimedb';
	import type { DbConnection, Room } from '$lib/bindings';
	import { UseRooms } from './UseRooms.svelte';
	import { m } from '$lib/paraglide/messages';

	// Modal IDs
	const CREATE_ROOM_MODAL_ID = 'create_room_modal';
	const PASSWORD_MODAL_ID = 'password_modal';

	// Constants
	const MAX_PASSWORD_LENGTH = 64;

	// Modal utility functions
	function openModal(modalId: string) {
		(document.getElementById(modalId) as HTMLDialogElement)?.showModal();
	}

	function closeModal(modalId: string) {
		(document.getElementById(modalId) as HTMLDialogElement)?.close();
	}

	let {
		conn,
		you
	}: {
		conn: DbConnection;
		you: You;
	} = $props();

	let name = $state(you.name);
	$effect(() => {
		if (you.name) {
			name = you.name;
		}
	});
	let nameUpdating = $state(false);
	let nameEditing = $state(false);
	let creatingRoom = $state(false);
	let roomPassword = $state('');

	const useRooms = new UseRooms(conn);
	export function stopUseRooms() {
		return useRooms.stop();
	}

	let roomToJoin = $state<Room | null>(null);
	let passwordError = $state('');
	let joiningWithPassword = $state(false);
	let passwordInput = $state('');

	async function onNameSubmit(
		e: SubmitEvent & {
			currentTarget: EventTarget & HTMLFormElement;
		}
	) {
		e.preventDefault();
		const newName = new FormData(e.currentTarget).get('name') as string;
		if (!newName || newName === you.name) return;

		nameUpdating = true;
		try {
			await conn.reducers.setName({ name: newName });
			nameEditing = false;
		} catch (err) {
			console.error('Failed to set name:', err);
		} finally {
			nameUpdating = false;
		}
	}

	async function createRoom(event: SubmitEvent) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget as HTMLFormElement);
		const title = (formData.get('title') as string)?.trim() || (you.name ?? m.unknown_user());
		const password = roomPassword.trim() || undefined;

		// Client-side validation
		if (password && password.length > MAX_PASSWORD_LENGTH) {
			return; // Form validation will handle the error display
		}

		creatingRoom = true;
		try {
			await conn.reducers.createRoom({ title, password });
			closeModal(CREATE_ROOM_MODAL_ID);
		} catch (err) {
			console.error('Failed to create room:', err);
		} finally {
			creatingRoom = false;
		}
	}

	function openCreateRoomModal() {
		openModal(CREATE_ROOM_MODAL_ID);
	}

	function cancelCreateRoom() {
		closeModal(CREATE_ROOM_MODAL_ID);
		roomPassword = ''; // Reset password field
	}

	async function joinRoom(room: Room) {
		if (room.hasPassword) {
			// Show password prompt modal
			roomToJoin = room;
			openModal(PASSWORD_MODAL_ID);
			return;
		}

		roomToJoin = room;
		try {
			await conn.reducers.joinToRoom({ roomId: room.id, password: undefined });
			resetPasswordModal();
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			console.error('Failed to join room:', errorMessage);
		}
	}

	async function joinRoomWithPassword(event: SubmitEvent) {
		event.preventDefault();
		if (!roomToJoin) return;

		const password = passwordInput.trim();
		if (!password) return;

		// Client-side validation
		if (password.length > MAX_PASSWORD_LENGTH) {
			passwordError = m.password_too_long({ maxLength: MAX_PASSWORD_LENGTH });
			return;
		}

		passwordError = '';
		joiningWithPassword = true;
		try {
			await conn.reducers.joinToRoom({ roomId: roomToJoin.id, password });
			resetPasswordModal();
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			if (errorMessage.includes('Incorrect password') || err instanceof SenderError) {
				passwordError = errorMessage.includes('Incorrect password')
					? m.incorrect_password()
					: errorMessage;
			} else {
				passwordError = errorMessage;
				console.error('Failed to join room:', errorMessage);
				resetPasswordModal();
			}
		} finally {
			joiningWithPassword = false;
		}
	}

	function cancelPasswordJoin() {
		closeModal(PASSWORD_MODAL_ID);
		passwordError = '';
		roomToJoin = null;
		joiningWithPassword = false;
		passwordInput = '';
	}

	function resetPasswordModal() {
		closeModal(PASSWORD_MODAL_ID);
		passwordError = '';
		roomToJoin = null;
		joiningWithPassword = false;
		passwordInput = '';
	}
</script>

{#snippet nameInputForm()}
	<form onsubmit={onNameSubmit} class="flex flex-col gap-4">
		<input
			class="input"
			name="name"
			type="text"
			placeholder={m.legal_cool_dolphin_cry()}
			bind:value={name}
			disabled={nameUpdating}
		/>
		<button type="submit" class="btn btn-primary">
			{#if nameUpdating}
				<span class="loading loading-spinner loading-md"></span>
			{:else}
				{m.save()}
			{/if}
		</button>
	</form>
{/snippet}

<div class="flex flex-col gap-4 text-center">
	{#if you.name}
		<div class="flex items-center justify-center gap-2">
			<h1>{m.awake_acidic_deer_swim()}<span class="font-bold">{you.name}</span>!</h1>
			<button
				onclick={() => {
					nameEditing = !nameEditing;
				}}
				class="btn btn-xs">{nameEditing ? m.cancel() : m.edit()}</button
			>
		</div>
	{/if}
	{#if !you.name}
		{@render nameInputForm()}
	{:else if nameEditing}
		{@render nameInputForm()}
	{/if}
	{#if you.name}
		<div class="space-y-4">
			<div>
				<button type="button" class="btn btn-primary" onclick={openCreateRoomModal}>
					{m.great_suave_dolphin_achieve()}
				</button>
			</div>

			<a href="/online/leaderboard" class="btn btn-outline btn-secondary btn-sm"
				>🏅 {m.just_maroon_insect_soar()}</a
			>

			<div class="space-y-2" class:hidden={!useRooms.rooms}>
				<h2>{m.actual_gray_scallop_sway()} ({useRooms.rooms.length})</h2>
				<ol class="space-y-1">
					{#each useRooms.rooms as room (room.id)}
						<li class="">
							<button class="btn btn-sm" onclick={() => joinRoom(room)}>
								{room.title}
								{#if room.hasPassword}
									<span class="text-xs">🔒</span>
								{/if}
							</button>
						</li>
					{/each}
				</ol>
			</div>
		</div>
	{/if}
</div>

<!-- Create Room Modal -->
<dialog id={CREATE_ROOM_MODAL_ID} class="modal">
	<div class="modal-box max-w-md space-y-6 text-left">
		<!-- Header -->
		<div class="text-center">
			<h3 class="text-base-content text-xl font-bold">{m.great_suave_dolphin_achieve()}</h3>
			<p class="text-base-content/70 text-sm">{m.create_room_description()}</p>
		</div>

		<form onsubmit={createRoom} class="space-y-4">
			<!-- Room Name Field -->
			<div>
				<label class="label" for="room-title">
					<span class="text-base-content font-medium">{m.room_name()}</span>
				</label>
				<input
					id="room-title"
					type="text"
					name="title"
					placeholder={you.name ?? m.unknown_user()}
					class="input input-bordered focus:input-primary w-full transition-colors"
					disabled={creatingRoom}
				/>
				<div class="label">
					<span class="text-base-content/60 text-sm">{m.room_name_hint()}</span>
				</div>
			</div>

			<!-- Password Field -->
			<div>
				<label class="label" for="room-password">
					<span class="text-base-content font-medium">{m.room_password_label()}</span>
				</label>
				<div class="relative">
					<input
						id="room-password"
						type="password"
						name="password"
						placeholder={m.room_password_placeholder()}
						class="input input-bordered focus:input-primary w-full pr-10 transition-colors"
						class:input-error={roomPassword.length > MAX_PASSWORD_LENGTH}
						disabled={creatingRoom}
						bind:value={roomPassword}
						maxlength={MAX_PASSWORD_LENGTH}
					/>
					<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
						<svg
							class="text-base-content/40 h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
							></path>
						</svg>
					</div>
				</div>
				<div class="label">
					<span class="text-base-content/60 text-sm">{m.room_password_hint()}</span>
					<span
						class="text-base-content/60 text-xs"
						class:text-error={roomPassword.length > MAX_PASSWORD_LENGTH}
					>
						{roomPassword.length}/{MAX_PASSWORD_LENGTH}
					</span>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="modal-action pt-4">
				<button
					type="button"
					class="btn btn-ghost"
					onclick={cancelCreateRoom}
					disabled={creatingRoom}
				>
					{m.cancel()}
				</button>
				<button type="submit" class="btn btn-primary min-w-[120px]" disabled={creatingRoom}>
					{#if creatingRoom}
						<span class="loading loading-spinner loading-sm"></span>
						{m.creating()}
					{:else}
						{m.great_suave_dolphin_achieve()}
					{/if}
				</button>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={cancelCreateRoom}>{m.close()}</button>
	</form>
</dialog>

<!-- Password Modal -->
<dialog id={PASSWORD_MODAL_ID} class="modal">
	<div class="modal-box">
		<h3 class="text-lg font-bold">{m.enter_room_password()}</h3>
		<p class="py-4">{m.room_requires_password({ title: roomToJoin?.title ?? '' })}</p>
		<form onsubmit={joinRoomWithPassword} class="space-y-4">
			<div>
				<input
					type="password"
					name="password"
					placeholder={m.enter_password_placeholder()}
					class="input input-bordered w-full"
					class:input-error={passwordError || passwordInput.length > MAX_PASSWORD_LENGTH}
					disabled={joiningWithPassword}
					bind:value={passwordInput}
					maxlength={MAX_PASSWORD_LENGTH}
				/>
				<div class="label">
					<span></span>
					<span
						class="text-base-content/60 text-xs"
						class:text-error={passwordInput.length > MAX_PASSWORD_LENGTH}
					>
						{passwordInput.length}/{MAX_PASSWORD_LENGTH}
					</span>
				</div>
			</div>
			{#if passwordError}
				<p class="text-error text-sm">{passwordError}</p>
			{/if}
			<div class="modal-action">
				<button
					type="button"
					class="btn"
					onclick={cancelPasswordJoin}
					disabled={joiningWithPassword}>{m.cancel()}</button
				>
				<button
					type="submit"
					class="btn btn-primary"
					disabled={joiningWithPassword || !passwordInput.trim()}
				>
					{#if joiningWithPassword}
						<span class="loading loading-spinner loading-sm"></span>
						{m.joining()}
					{:else}
						{m.join_room()}
					{/if}
				</button>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={cancelPasswordJoin}>{m.close()}</button>
	</form>
</dialog>
